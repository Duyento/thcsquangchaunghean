export const STORAGE_WRITE_LOCK_KEY = "thcs_quang_chau_admin_restore_lock_v1";
export const STORAGE_WRITE_LOCK_NAME = "bdg-admin-local-storage-write";

export interface CoordinatedStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let activeLocalWriteOwner: string | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.document !== "undefined";
}

export async function withStorageWriteLock<T>(
  storage: CoordinatedStorage,
  operation: () => T | Promise<T>
): Promise<T> {
  if (!isBrowser()) return operation();
  if (!navigator.locks?.request) {
    throw new Error("Trình duyệt không hỗ trợ khóa ghi liên tab; thao tác dữ liệu đã bị từ chối.");
  }

  return navigator.locks.request(
    STORAGE_WRITE_LOCK_NAME,
    { mode: "exclusive", ifAvailable: true },
    async (lock) => {
      if (!lock) throw new Error("Một tab khác đang ghi dữ liệu; thao tác đã bị từ chối.");

      const currentOwner = storage.getItem(STORAGE_WRITE_LOCK_KEY);
      if (currentOwner !== null) storage.removeItem(STORAGE_WRITE_LOCK_KEY);
      if (!globalThis.crypto?.randomUUID) {
        throw new Error("Không hỗ trợ tạo mã khóa an toàn; thao tác dữ liệu đã bị từ chối.");
      }
      const owner = crypto.randomUUID();
      let markerWritten = false;
      const previousLocalOwner = activeLocalWriteOwner;
      try {
        storage.setItem(STORAGE_WRITE_LOCK_KEY, owner);
        markerWritten = true;
        if (storage.getItem(STORAGE_WRITE_LOCK_KEY) !== owner) {
          throw new Error("Không xác minh được khóa ghi; thao tác đã bị từ chối.");
        }
        activeLocalWriteOwner = owner;
        return await operation();
      } finally {
        activeLocalWriteOwner = previousLocalOwner;
        if (markerWritten && storage.getItem(STORAGE_WRITE_LOCK_KEY) === owner) {
          storage.removeItem(STORAGE_WRITE_LOCK_KEY);
        }
      }
    }
  );
}

export function withLocalStorageWriteLock<T>(operation: () => T | Promise<T>): Promise<T> {
  if (!isBrowser()) return Promise.resolve(operation());
  return withStorageWriteLock(window.localStorage, operation);
}

export function assertStorageWriteLockClear(): void {
  if (!isBrowser()) return;
  const markerOwner = window.localStorage.getItem(STORAGE_WRITE_LOCK_KEY);
  if (activeLocalWriteOwner !== null && markerOwner === activeLocalWriteOwner) return;
  if (markerOwner !== null) {
    throw new Error("Đang có thao tác phục hồi hoặc staging ở tab khác; thao tác ghi đã bị chặn.");
  }
  if (!navigator.locks?.request) {
    throw new Error("Trình duyệt không hỗ trợ khóa ghi liên tab; thao tác ghi đã bị từ chối.");
  }
  throw new Error("Thao tác ghi chưa lấy khóa liên tab; thao tác đã bị từ chối.");
}
