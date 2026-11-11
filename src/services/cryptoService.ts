/**
 * Cryptographic helper for secure password hashing and salt generation
 * Using standard browser Web Crypto API (SubtleCrypto) with SHA-256
 */

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + ":" + salt + ":thcs_quang_chau_salt_guard_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionSignature(userId: string, token: string, expiresAt: number): Promise<string> {
  const enc = new TextEncoder();
  const raw = `${userId}:${token}:${expiresAt}:thcs_quang_chau_secret_session_vault_2026`;
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(raw));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function createTamperProofToken(userId: string, expiresAt: number): string {
  const enc = `${userId}_${expiresAt}_thcs_quang_chau_salt_guard_2026`;
  let h1 = 0xdeadbeef ^ 15485863;
  let h2 = 0x41c6ce57 ^ 32452843;
  for (let i = 0; i < enc.length; i++) {
    const ch = enc.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const sig = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  return `sess_${userId}_${expiresAt}_${sig}`;
}

export function verifyTamperProofToken(token: string, userId: string, expiresAt: number): boolean {
  if (!token) return false;
  const expected = createTamperProofToken(userId, expiresAt);
  return token === expected;
}

export function createStudentToken(studentId: string, classId: string, expiresAt: number): string {
  const enc = `stu_${studentId}_${classId}_${expiresAt}_thcs_quang_chau_stu_vault_2026`;
  let h1 = 0xdeadbeef ^ 23456789;
  let h2 = 0x41c6ce57 ^ 98765432;
  for (let i = 0; i < enc.length; i++) {
    const ch = enc.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const sig = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  return `stu_tok_${studentId}_${classId}_${expiresAt}_${sig}`;
}

export function verifyStudentToken(token: string, studentId: string, classId: string, expiresAt: number): boolean {
  if (!token) return false;
  const expected = createStudentToken(studentId, classId, expiresAt);
  return token === expected;
}
