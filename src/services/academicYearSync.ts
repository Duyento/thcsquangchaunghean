import {
  createBackupSealer,
  decryptBackupPayload,
  type BackupSealer,
} from "./secureBackup";
import { withStorageWriteLock } from "./storageWriteLock";

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const ACADEMIC_YEAR_SYNC_JOURNAL_KEY =
  "thcs_quang_chau_admin_academic_year_sync_journal_v1";
type StageStatus =
  | "prepared"
  | "applying"
  | "applied"
  | "rolling_back"
  | "rolled_back"
  | "stopped"
  | "completed";

type EntryStatus = "pending" | "writing" | "written" | "restoring" | "restored";

interface StageEntry {
  key: string;
  beforeRaw: string | null;
  afterRaw: string | null;
  beforeFingerprint: string;
  afterFingerprint: string;
  status: EntryStatus;
}

export interface StorageStage {
  readonly id: string;
  status: StageStatus;
}

// Raw snapshots stay out of the returned object and persistent journal.
interface StageState {
  entries: StageEntry[];
  journalRaw: string | null;
  seal: BackupSealer;
}

const stageStates = new WeakMap<StorageStage, StageState>();

function getStageState(stage: StorageStage): StageState {
  const state = stageStates.get(stage);
  if (!state) throw new Error("Không tìm thấy dữ liệu staging trong phiên hiện tại.");
  return state;
}

interface JournalEntry {
  key: string;
  beforeFingerprint: string;
  afterFingerprint: string;
  status: EntryStatus;
}

interface JournalRecord {
  schemaVersion: 2;
  stageId: string;
  status: StageStatus;
  updatedAt: string;
  entries: JournalEntry[];
  encryptedState: string;
}

export interface StorageStageSummary {
  stageId: string;
  status: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fingerprint(value: string | null): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Không hỗ trợ SHA-256; staging đã dừng.");
  }

  const payload = value === null ? "missing\u0000" : `present\u0000${value}`;
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload)
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readJournals(storage: StoragePort): JournalRecord[] {
  const raw = storage.getItem(ACADEMIC_YEAR_SYNC_JOURNAL_KEY);
  if (raw === null) return [];

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Journal staging không hợp lệ; không tiếp tục.");
  }

  if (
    typeof value !== "object"
    || value === null
    || !Array.isArray(value)
  ) {
    throw new Error("Journal staging không hợp lệ; không tiếp tục.");
  }

  const records: unknown[] = value;
  for (const record of records) {
    const statuses: StageStatus[] = [
      "prepared",
      "applying",
      "applied",
      "rolling_back",
      "rolled_back",
      "stopped",
      "completed",
    ];
    const entryStatuses: EntryStatus[] = ["pending", "writing", "written", "restoring", "restored"];
    if (
      !isRecord(record)
      || record.schemaVersion !== 2
      || typeof record.stageId !== "string"
      || typeof record.status !== "string"
      || typeof record.updatedAt !== "string"
      || !statuses.some((status) => status === record.status)
      || !Array.isArray(record.entries)
      || typeof record.encryptedState !== "string"
      || !record.entries.every((entry: unknown) => {
        if (!isRecord(entry)) return false;
        return typeof entry.key === "string"
          && typeof entry.beforeFingerprint === "string"
          && typeof entry.afterFingerprint === "string"
          && typeof entry.status === "string"
          && entryStatuses.some((status) => status === entry.status);
      })
    ) {
      throw new Error("Journal staging không hợp lệ; không tiếp tục.");
    }
  }
  return value as JournalRecord[];
}

export function listRecoverableStorageStages(storage: StoragePort): StorageStageSummary[] {
  return readJournals(storage)
    .filter((record) =>
      record.status === "prepared"
      || record.status === "applying"
      || record.status === "applied"
      || record.status === "rolling_back"
      || record.status === "stopped"
    )
    .map(({ stageId, status, updatedAt }) => ({ stageId, status, updatedAt }));
}

async function writeJournal(storage: StoragePort, stage: StorageStage): Promise<void> {
  const state = getStageState(stage);
  const currentRaw = storage.getItem(ACADEMIC_YEAR_SYNC_JOURNAL_KEY);
  if (currentRaw !== state.journalRaw) {
    throw new Error("Journal thay đổi ngoài staging; dừng và cần quản trị viên rà soát.");
  }
  const records = readJournals(storage);
  const existingIndex = records.findIndex((record) => record.stageId === stage.id);
  const nextRecord: JournalRecord = {
    schemaVersion: 2,
    stageId: stage.id,
    status: stage.status,
    updatedAt: new Date().toISOString(),
    entries: state.entries.map(({ key, beforeFingerprint, afterFingerprint, status }) => ({
      key,
      beforeFingerprint,
      afterFingerprint,
      status,
    })),
    encryptedState: await state.seal({
      stageId: stage.id,
      status: stage.status,
      entries: state.entries,
    }),
  };
  if (existingIndex === -1) records.push(nextRecord);
  else records[existingIndex] = nextRecord;

  const serialized = JSON.stringify(records);
  storage.setItem(ACADEMIC_YEAR_SYNC_JOURNAL_KEY, serialized);
  if (storage.getItem(ACADEMIC_YEAR_SYNC_JOURNAL_KEY) !== serialized) {
    throw new Error("Không xác minh được journal staging; dừng thao tác.");
  }
  state.journalRaw = serialized;
}

function requireSameStage(storage: StoragePort, stage: StorageStage): JournalRecord {
  const state = getStageState(stage);
  const journalRaw = storage.getItem(ACADEMIC_YEAR_SYNC_JOURNAL_KEY);
  if (journalRaw !== state.journalRaw) {
    throw new Error("Journal thay đổi ngoài staging; dừng và cần quản trị viên rà soát.");
  }
  const journal = readJournals(storage).find((record) => record.stageId === stage.id);
  if (!journal || journal.status !== stage.status) {
    throw new Error("Journal không khớp với staging hiện tại; dừng thao tác.");
  }
  return journal;
}

async function assertExpectedState(storage: StoragePort, stage: StorageStage): Promise<void> {
  for (const entry of getStageState(stage).entries) {
    const actualRaw = storage.getItem(entry.key);
    const matchesBefore = actualRaw === entry.beforeRaw
      && await fingerprint(actualRaw) === entry.beforeFingerprint;
    const matchesAfter = actualRaw === entry.afterRaw
      && await fingerprint(actualRaw) === entry.afterFingerprint;
    const transitionMayBeInterrupted = entry.status === "writing" || entry.status === "restoring";
    const expectsAfter = entry.status === "written";
    if (
      transitionMayBeInterrupted
        ? !matchesBefore && !matchesAfter
        : expectsAfter
          ? !matchesAfter
          : !matchesBefore
    ) {
      throw new Error("Phát hiện dữ liệu thay đổi ngoài staging; dừng và cần quản trị viên rà soát.");
    }
  }
}

function writeValue(storage: StoragePort, key: string, value: string | null): void {
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, value);
}

async function createStorageStageUnlocked(
  storage: StoragePort,
  updates: Array<{ key: string; value: string | null }>,
  password: string
): Promise<StorageStage> {
  if (password.length < 12) throw new Error("Mật khẩu staging phải có ít nhất 12 ký tự.");
  if (updates.length === 0) throw new Error("Staging không có dữ liệu thay đổi.");
  if (updates.some(({ key }) => !key || key === ACADEMIC_YEAR_SYNC_JOURNAL_KEY)) {
    throw new Error("Khóa staging không hợp lệ.");
  }
  if (new Set(updates.map(({ key }) => key)).size !== updates.length) {
    throw new Error("Staging chứa khóa trùng lặp.");
  }

  const journalRaw = storage.getItem(ACADEMIC_YEAR_SYNC_JOURNAL_KEY);
  const previousJournals = readJournals(storage);
  if (previousJournals.some((record) =>
    record.status !== "rolled_back" && record.status !== "completed"
  )) {
    throw new Error("Đang có journal chưa kết thúc; cần quản trị viên rà soát trước.");
  }
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Không hỗ trợ tạo định danh staging an toàn; staging đã dừng.");
  }
  const seal = await createBackupSealer(password);

  const entries = await Promise.all(updates.map(async ({ key, value }) => {
    const beforeRaw = storage.getItem(key);
    return {
      key,
      beforeRaw,
      afterRaw: value,
      beforeFingerprint: await fingerprint(beforeRaw),
      afterFingerprint: await fingerprint(value),
      status: "pending" as const,
    };
  }));
  if (entries.some((entry) => storage.getItem(entry.key) !== entry.beforeRaw)) {
    throw new Error("Dữ liệu thay đổi trong lúc tạo staging; không có dữ liệu nào được áp dụng.");
  }
  const stage: StorageStage = {
    id: globalThis.crypto.randomUUID(),
    status: "prepared",
  };
  stageStates.set(stage, { entries, journalRaw, seal });

  await writeJournal(storage, stage);
  return stage;
}

async function recoverStorageStageUnlocked(
  storage: StoragePort,
  stageId: string,
  password: string
): Promise<StorageStage> {
  const journalRaw = storage.getItem(ACADEMIC_YEAR_SYNC_JOURNAL_KEY);
  const record = readJournals(storage).find((item) => item.stageId === stageId);
  if (!journalRaw || !record) throw new Error("Không tìm thấy journal staging cần phục hồi.");

  const decrypted = await decryptBackupPayload(record.encryptedState, password);
  if (
    !isRecord(decrypted)
    || decrypted.stageId !== record.stageId
    || decrypted.status !== record.status
    || !Array.isArray(decrypted.entries)
  ) {
    throw new Error("Snapshot staging mã hóa không đúng cấu trúc.");
  }
  const entries = decrypted.entries as unknown[];
  if (
    entries.length !== record.entries.length
    || !entries.every((entry, index) => {
      const journalEntry = record.entries[index];
      if (!isRecord(entry)) return false;
      return typeof entry.key === "string"
        && entry.key === journalEntry.key
        && (typeof entry.beforeRaw === "string" || entry.beforeRaw === null)
        && (typeof entry.afterRaw === "string" || entry.afterRaw === null)
        && entry.beforeFingerprint === journalEntry.beforeFingerprint
        && entry.afterFingerprint === journalEntry.afterFingerprint
        && entry.status === journalEntry.status;
    })
  ) {
    throw new Error("Snapshot staging không khớp journal; không tiếp tục phục hồi.");
  }
  const recoveredEntries = entries as StageEntry[];
  const stage: StorageStage = { id: record.stageId, status: record.status };
  const seal = await createBackupSealer(password);
  stageStates.set(stage, { entries: recoveredEntries, journalRaw, seal });

  if (stage.status === "applying" || stage.status === "rolling_back") {
    stage.status = "stopped";
    await writeJournal(storage, stage);
  }
  return stage;
}

async function applyStorageStageUnlocked(storage: StoragePort, stage: StorageStage): Promise<void> {
  if (stage.status !== "prepared") throw new Error("Staging không ở trạng thái sẵn sàng.");

  try {
    requireSameStage(storage, stage);
    await assertExpectedState(storage, stage);
    stage.status = "applying";
    await writeJournal(storage, stage);

    for (const entry of getStageState(stage).entries) {
      requireSameStage(storage, stage);
      await assertExpectedState(storage, stage);
      entry.status = "writing";
      await writeJournal(storage, stage);
      writeValue(storage, entry.key, entry.afterRaw);
      if (storage.getItem(entry.key) !== entry.afterRaw) {
        throw new Error("Không xác minh được dữ liệu sau khi ghi; dừng và cần rà soát.");
      }
      entry.status = "written";
      await writeJournal(storage, stage);
    }

    requireSameStage(storage, stage);
    stage.status = "applied";
    await writeJournal(storage, stage);
  } catch (error) {
    stage.status = "stopped";
    try {
      await writeJournal(storage, stage);
    } catch {
      throw new Error("Staging dừng; không ghi được journal trạng thái. Cần rà soát thủ công.");
    }
    throw error instanceof Error ? error : new Error("Staging dừng do lỗi không xác định.");
  }
}

async function rollbackStorageStageUnlocked(storage: StoragePort, stage: StorageStage): Promise<void> {
  if (stage.status === "completed") {
    throw new Error("Staging đã áp dụng hoàn chỉnh; không được rollback.");
  }
  if (stage.status !== "prepared" && stage.status !== "applied" && stage.status !== "stopped") {
    throw new Error("Chỉ staging chưa áp dụng hoặc được phục hồi an toàn mới được rollback.");
  }

  try {
    requireSameStage(storage, stage);
    await assertExpectedState(storage, stage);
    stage.status = "rolling_back";
    await writeJournal(storage, stage);

    for (const entry of [...getStageState(stage).entries].reverse()) {
      requireSameStage(storage, stage);
      await assertExpectedState(storage, stage);
      entry.status = "restoring";
      await writeJournal(storage, stage);
      writeValue(storage, entry.key, entry.beforeRaw);
      if (storage.getItem(entry.key) !== entry.beforeRaw) {
        throw new Error("Không xác minh được dữ liệu rollback; dừng và cần rà soát.");
      }
      entry.status = "restored";
      await writeJournal(storage, stage);
    }

    requireSameStage(storage, stage);
    stage.status = "rolled_back";
    await writeJournal(storage, stage);
  } catch (error) {
    stage.status = "stopped";
    try {
      await writeJournal(storage, stage);
    } catch {
      throw new Error("Rollback dừng; không ghi được journal trạng thái. Cần rà soát thủ công.");
    }
    throw error instanceof Error ? error : new Error("Rollback dừng do lỗi không xác định.");
  }
}

async function completeStorageStageUnlocked(storage: StoragePort, stage: StorageStage): Promise<void> {
  if (stage.status !== "applied") throw new Error("Chỉ staging đã áp dụng mới được hoàn tất.");
  try {
    requireSameStage(storage, stage);
    await assertExpectedState(storage, stage);
    stage.status = "completed";
    await writeJournal(storage, stage);
  } catch (error) {
    stage.status = "stopped";
    try {
      await writeJournal(storage, stage);
    } catch {
      throw new Error("Staging dừng; không ghi được journal trạng thái. Cần rà soát thủ công.");
    }
    throw error instanceof Error ? error : new Error("Không thể hoàn tất staging.");
  }
}

export function applyStorageStageAtomically(
  storage: StoragePort,
  updates: Array<{ key: string; value: string | null }>,
  password: string
): Promise<StorageStage> {
  return withStorageWriteLock(storage, async () => {
    const stage = await createStorageStageUnlocked(storage, updates, password);
    try {
      await applyStorageStageUnlocked(storage, stage);
      await completeStorageStageUnlocked(storage, stage);
      return stage;
    } catch (error) {
      if (stage.status === "stopped" || stage.status === "applied") {
        try {
          await rollbackStorageStageUnlocked(storage, stage);
        } catch (rollbackError) {
          const reason = error instanceof Error ? error.message : "Lỗi áp dụng staging không xác định.";
          const rollbackReason = rollbackError instanceof Error
            ? rollbackError.message
            : "Lỗi rollback không xác định.";
          throw new Error(`${reason} Snapshot rollback chưa được xác minh: ${rollbackReason}`);
        }
      }
      throw error instanceof Error ? error : new Error("Không thể áp dụng staging.");
    }
  });
}

export function createStorageStage(
  storage: StoragePort,
  updates: Array<{ key: string; value: string | null }>,
  password: string
): Promise<StorageStage> {
  return withStorageWriteLock(storage, () => createStorageStageUnlocked(storage, updates, password));
}

export function recoverStorageStage(
  storage: StoragePort,
  stageId: string,
  password: string
): Promise<StorageStage> {
  return withStorageWriteLock(storage, () => recoverStorageStageUnlocked(storage, stageId, password));
}

export function applyStorageStage(storage: StoragePort, stage: StorageStage): Promise<void> {
  return withStorageWriteLock(storage, () => applyStorageStageUnlocked(storage, stage));
}

export function rollbackStorageStage(storage: StoragePort, stage: StorageStage): Promise<void> {
  return withStorageWriteLock(storage, () => rollbackStorageStageUnlocked(storage, stage));
}

export function completeStorageStage(storage: StoragePort, stage: StorageStage): Promise<void> {
  return withStorageWriteLock(storage, () => completeStorageStageUnlocked(storage, stage));
}
