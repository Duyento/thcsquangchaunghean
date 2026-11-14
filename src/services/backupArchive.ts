export const BACKUP_ARCHIVE_DATABASE = "bdg-encrypted-backup-archive";
export const BACKUP_ARCHIVE_STORE = "backups";

export interface BackupArchiveRecord {
  id: string;
  timestamp: string;
  schemaVersion: number;
  checksum: string;
  content: string;
}

export interface BackupArchive {
  get(id: string): Promise<BackupArchiveRecord | undefined>;
  getAll(): Promise<BackupArchiveRecord[]>;
  add(record: BackupArchiveRecord): Promise<void>;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function checksum(content: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Trình duyệt không hỗ trợ SHA-256; không thể lưu backup.");
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return bytesToHex(new Uint8Array(digest));
}

function openArchiveDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB không khả dụng; không thể lưu backup nội bộ."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BACKUP_ARCHIVE_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(BACKUP_ARCHIVE_STORE)) {
        request.result.createObjectStore(BACKUP_ARCHIVE_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Không thể mở kho backup IndexedDB: ${request.error?.message ?? "lỗi không xác định"}`));
    request.onblocked = () => reject(new Error("Kho backup IndexedDB đang bị chặn bởi một tab khác."));
  });
}

class IndexedDbBackupArchive implements BackupArchive {
  async get(id: string): Promise<BackupArchiveRecord | undefined> {
    const database = await openArchiveDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(BACKUP_ARCHIVE_STORE, "readonly")
        .objectStore(BACKUP_ARCHIVE_STORE)
        .get(id);
      request.onsuccess = () => {
        database.close();
        resolve(request.result as BackupArchiveRecord | undefined);
      };
      request.onerror = () => {
        database.close();
        reject(new Error(`Không thể đọc backup nội bộ: ${request.error?.message ?? "lỗi không xác định"}`));
      };
    });
  }

  async getAll(): Promise<BackupArchiveRecord[]> {
    const database = await openArchiveDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(BACKUP_ARCHIVE_STORE, "readonly")
        .objectStore(BACKUP_ARCHIVE_STORE)
        .getAll();
      request.onsuccess = () => {
        database.close();
        resolve(request.result as BackupArchiveRecord[]);
      };
      request.onerror = () => {
        database.close();
        reject(new Error(`Không thể liệt kê backup nội bộ: ${request.error?.message ?? "lỗi không xác định"}`));
      };
    });
  }

  async add(record: BackupArchiveRecord): Promise<void> {
    const database = await openArchiveDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(BACKUP_ARCHIVE_STORE, "readwrite");
      transaction.objectStore(BACKUP_ARCHIVE_STORE).add(record);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        if (transaction.error?.name === "ConstraintError") {
          reject(new Error(`Backup ID đã tồn tại (${record.id}); bản cũ không bị ghi đè.`));
          return;
        }
        reject(new Error(`Không thể lưu backup nội bộ: ${transaction.error?.message ?? "lỗi không xác định"}`));
      };
      transaction.onabort = () => {
        database.close();
        reject(new Error(`Lưu backup nội bộ đã bị hủy: ${transaction.error?.message ?? "lỗi không xác định"}`));
      };
    });
  }
}

export const indexedDbBackupArchive: BackupArchive = new IndexedDbBackupArchive();

export async function saveBackupToArchive(
  content: string,
  schemaVersion: number,
  archive: BackupArchive = indexedDbBackupArchive,
  id: string = crypto.randomUUID(),
  timestamp = new Date().toISOString()
): Promise<BackupArchiveRecord> {
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error("schemaVersion backup không hợp lệ.");
  }
  if (await archive.get(id)) {
    throw new Error(`Backup ID đã tồn tại (${id}); bản cũ không bị ghi đè.`);
  }
  const record: BackupArchiveRecord = {
    id,
    timestamp,
    schemaVersion,
    checksum: await checksum(content),
    content,
  };
  await archive.add(record);
  return record;
}

export async function verifyArchivedBackup(record: BackupArchiveRecord): Promise<void> {
  if (await checksum(record.content) !== record.checksum) {
    throw new Error(`Checksum backup ${record.id} không khớp.`);
  }
}
