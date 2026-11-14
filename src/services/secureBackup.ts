export const SECURE_BACKUP_FORMAT = "BDG_ENCRYPTED_BACKUP";
export const SECURE_BACKUP_ENVELOPE_VERSION = 1;
const KDF_ITERATIONS = 310_000;

export interface EncryptedBackupEnvelope {
  format: typeof SECURE_BACKUP_FORMAT;
  envelopeVersion: typeof SECURE_BACKUP_ENVELOPE_VERSION;
  algorithm: "AES-GCM";
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  checksum: string;
}

export type BackupSealer = (payload: unknown) => Promise<string>;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes));
  return bytesToHex(new Uint8Array(digest));
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(password)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: toArrayBuffer(salt), iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function validatePassword(password: string): void {
  if (password.length < 12) {
    throw new Error("Mật khẩu backup phải có ít nhất 12 ký tự.");
  }
}

export async function createBackupSealer(password: string): Promise<BackupSealer> {
  validatePassword(password);
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new Error("Trình duyệt không hỗ trợ mã hóa backup an toàn.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt, KDF_ITERATIONS);
  return async (payload: unknown): Promise<string> => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(plaintext)
    );
    const ciphertext = new Uint8Array(encrypted);
    const envelope: EncryptedBackupEnvelope = {
      format: SECURE_BACKUP_FORMAT,
      envelopeVersion: SECURE_BACKUP_ENVELOPE_VERSION,
      algorithm: "AES-GCM",
      kdf: "PBKDF2-SHA-256",
      iterations: KDF_ITERATIONS,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(ciphertext),
      checksum: await sha256(ciphertext),
    };
    return JSON.stringify(envelope, null, 2);
  };
}

export async function encryptBackupPayload(payload: unknown, password: string): Promise<string> {
  const seal = await createBackupSealer(password);
  return seal(payload);
}

export async function decryptBackupPayload(json: string, password: string): Promise<unknown> {
  validatePassword(password);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Tệp backup không phải JSON hợp lệ.");
  }
  if (
    typeof parsed !== "object"
    || parsed === null
    || Array.isArray(parsed)
  ) {
    throw new Error("Cấu trúc tệp backup không hợp lệ.");
  }

  const envelope = parsed as Partial<EncryptedBackupEnvelope>;
  if (
    envelope.format !== SECURE_BACKUP_FORMAT
    || envelope.envelopeVersion !== SECURE_BACKUP_ENVELOPE_VERSION
    || envelope.algorithm !== "AES-GCM"
    || envelope.kdf !== "PBKDF2-SHA-256"
    || envelope.iterations !== KDF_ITERATIONS
    || typeof envelope.salt !== "string"
    || typeof envelope.iv !== "string"
    || typeof envelope.ciphertext !== "string"
    || typeof envelope.checksum !== "string"
    || !/^[a-f\d]{64}$/i.test(envelope.checksum)
  ) {
    throw new Error("Schema hoặc thuật toán backup không được hỗ trợ.");
  }

  let salt: Uint8Array;
  let iv: Uint8Array;
  let ciphertext: Uint8Array;
  try {
    salt = base64ToBytes(envelope.salt);
    iv = base64ToBytes(envelope.iv);
    ciphertext = base64ToBytes(envelope.ciphertext);
  } catch {
    throw new Error("Dữ liệu mã hóa backup bị lỗi.");
  }
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) {
    throw new Error("Kích thước dữ liệu mã hóa backup không hợp lệ.");
  }
  if (await sha256(ciphertext) !== envelope.checksum.toLowerCase()) {
    throw new Error("Checksum backup không khớp; tệp có thể đã bị thay đổi.");
  }

  try {
    const key = await deriveKey(password, salt, envelope.iterations);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext)
    );
    return JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
  } catch {
    throw new Error("Không thể xác thực hoặc giải mã backup. Kiểm tra mật khẩu và tính toàn vẹn tệp.");
  }
}

export function createBackupFilename(date = new Date(), uniqueId: string = crypto.randomUUID()): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return `bdg-encrypted-backup-${timestamp}-${uniqueId}.json`;
}
