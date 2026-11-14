export const MIGRATION_PREVIEW_SCHEMA_VERSION = 1;
export const RAW_BACKUP_FORMAT = "BDG_LOCALSTORAGE_RAW_BACKUP_V1";
export const SAFE_SNAPSHOT_FORMAT = "BDG_LOCALSTORAGE_SAFE_INVENTORY_V2";

export const ALLOWED_LOCAL_STORAGE_KEYS = Object.freeze([
  "thcs_quang_chau_admin_classes",
  "thcs_quang_chau_admin_logs",
  "thcs_quang_chau_admin_students",
  "thcs_quang_chau_admin_teachers",
  "thcs_quang_chau_admin_users",
  "thcs_quang_chau_student_quiz_records",
] as const);

export type MigrationDataGroup =
  | "classes"
  | "logs"
  | "students"
  | "teachers"
  | "users"
  | "quizRecords";

export type DataClassification = "DEMO" | "VERIFIED" | "UNKNOWN";

export interface PreviewIssue {
  group: MigrationDataGroup | "source";
  code: string;
  sourceIdFingerprint?: string;
  fields?: string[];
  message: string;
}

export interface GroupPreview {
  group: MigrationDataGroup;
  total: number;
  valid: number;
  duplicate: number;
  missingFields: number;
  orphaned: number;
  unverifiableRelations: number;
  demo: number;
  verified: number;
  unknown: number;
  notMigratable: number;
  migrationEligible: number;
  protectedValuesExcluded: number;
  quarantined: number;
  available: boolean;
}

export interface MigrationPreviewReport {
  schemaVersion: number;
  source: "localStorage" | "backup";
  sourceSchemaVersion: number | null;
  checksum: {
    algorithm: "SHA-256";
    actual: string | null;
    expected: string | null;
    status: "matched" | "mismatch" | "baseline_missing" | "invalid_expected";
  };
  structureValid: boolean;
  canConfirmInventory: boolean;
  totalGroups: number;
  totalRecords: number;
  valid: number;
  duplicate: number;
  missingFields: number;
  orphaned: number;
  unverifiableRelations: number;
  demo: number;
  verified: number;
  unknown: number;
  notMigratable: number;
  migrationEligible: number;
  protectedValuesExcluded: number;
  quarantined: number;
  groups: GroupPreview[];
  issues: PreviewIssue[];
  notices: string[];
}

type UnknownRecord = Record<string, unknown>;
type GroupData = Partial<Record<MigrationDataGroup, {
  available: boolean;
  records: unknown[];
}>>;

interface ClassifiedRecord {
  record: UnknownRecord;
  index: number;
  classification: DataClassification;
  missingFields: string[];
  invalid: boolean;
  duplicate: boolean;
  orphaned: boolean;
  unverifiable: boolean;
  notMigratable: boolean;
}

interface StorageReader {
  getItem(key: string): string | null;
}

export interface ReadOnlyLocalStorageSnapshot {
  schemaVersion: 2;
  format: typeof SAFE_SNAPSHOT_FORMAT;
  origin: string;
  capturedAt: string;
  keyCount: number;
  entries: SnapshotEntry[];
}

export type SnapshotKeyStatus = "read" | "missing" | "invalid";
export type SnapshotMappingStatus = "not_applicable" | "not_checked";

export interface SnapshotEntry {
  key: (typeof ALLOWED_LOCAL_STORAGE_KEYS)[number];
  status: SnapshotKeyStatus;
  recordCount: number | null;
  idFingerprints: string[];
  mappingStatus: SnapshotMappingStatus;
  accountStatusCounts?: {
    active: number;
    locked: number;
    pending: number;
    unknown: number;
  };
}

export interface SnapshotKeySummary extends SnapshotEntry {
  group: MigrationDataGroup;
}

export interface ReadOnlySnapshotSummary {
  capturedAt: string;
  readStatus: "complete" | "partial" | "invalid";
  totalRecords: number | null;
  groups: SnapshotKeySummary[];
}

export interface ReadOnlySnapshotCapture {
  snapshot: ReadOnlyLocalStorageSnapshot;
  summary: ReadOnlySnapshotSummary;
}

const GROUPS: MigrationDataGroup[] = [
  "classes",
  "logs",
  "students",
  "teachers",
  "users",
  "quizRecords",
];

const STORAGE_KEY_BY_GROUP: Record<MigrationDataGroup, (typeof ALLOWED_LOCAL_STORAGE_KEYS)[number]> = {
  classes: "thcs_quang_chau_admin_classes",
  logs: "thcs_quang_chau_admin_logs",
  students: "thcs_quang_chau_admin_students",
  teachers: "thcs_quang_chau_admin_teachers",
  users: "thcs_quang_chau_admin_users",
  quizRecords: "thcs_quang_chau_student_quiz_records",
};

export function captureReadOnlyLocalStorageSnapshot(
  storage: StorageReader,
  origin: string,
  capturedAt = new Date().toISOString()
): Promise<ReadOnlySnapshotCapture> {
  return captureSafeSnapshot(storage, origin, capturedAt);
}

async function captureSafeSnapshot(
  storage: StorageReader,
  origin: string,
  capturedAt: string
): Promise<ReadOnlySnapshotCapture> {
  let hasMissing = false;
  let hasInvalid = false;
  let totalRecords = 0;
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const entries: SnapshotEntry[] = [];
  const groups: SnapshotKeySummary[] = [];

  for (const key of ALLOWED_LOCAL_STORAGE_KEYS) {
    const group = GROUPS.find((candidate) => STORAGE_KEY_BY_GROUP[candidate] === key);
    if (!group) throw new Error("Khóa LocalStorage không có nhóm snapshot tương ứng.");

    const rawValue = storage.getItem(key);
    let entry: SnapshotEntry | undefined;
    if (rawValue === null) {
      hasMissing = true;
      entry = {
        key,
        recordCount: 0,
        status: "missing",
        idFingerprints: [],
        mappingStatus: group === "users" ? "not_checked" : "not_applicable",
      };
    } else {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        hasInvalid = true;
        entry = {
          key,
          recordCount: null,
          status: "invalid",
          idFingerprints: [],
          mappingStatus: group === "users" ? "not_checked" : "not_applicable",
        };
      }

      if (Array.isArray(parsed)) {
        const idFingerprints = await Promise.all(parsed.map((record, index) =>
          fingerprint(salt, group, isRecord(record) ? getId(record) : undefined, index)
        ));
        const accountStatusCounts = group === "users"
          ? parsed.reduce(
            (counts, record) => {
              const status = isRecord(record) ? record.status : undefined;
              if (status === "active" || status === "locked" || status === "pending") {
                counts[status] += 1;
              } else {
                counts.unknown += 1;
              }
              return counts;
            },
            { active: 0, locked: 0, pending: 0, unknown: 0 }
          )
          : undefined;
        totalRecords += parsed.length;
        entry = {
          key,
          recordCount: parsed.length,
          status: "read",
          idFingerprints,
          mappingStatus: group === "users" ? "not_checked" : "not_applicable",
          ...(accountStatusCounts ? { accountStatusCounts } : {}),
        };
      } else if (entry === undefined) {
        hasInvalid = true;
        entry = {
          key,
          recordCount: null,
          status: "invalid",
          idFingerprints: [],
          mappingStatus: group === "users" ? "not_checked" : "not_applicable",
        };
      }
    }

    if (!entry) throw new Error("Không thể tạo metadata snapshot hợp lệ.");
    entries.push(entry);
    groups.push({ group, ...entry });
  }

  return {
    snapshot: {
      schemaVersion: 2,
      format: SAFE_SNAPSHOT_FORMAT,
      origin,
      capturedAt,
      keyCount: entries.length,
      entries,
    },
    summary: {
      capturedAt,
      readStatus: hasInvalid ? "invalid" : hasMissing ? "partial" : "complete",
      totalRecords: hasInvalid ? null : totalRecords,
      groups,
    },
  };
}

export function createSnapshotFilename(capturedAt: string, uniqueSuffix: string): string {
  const timestamp = new Date(capturedAt);
  const suffix = uniqueSuffix.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!Number.isFinite(timestamp.getTime()) || suffix.length < 6) {
    throw new Error("Thời điểm hoặc mã duy nhất của tên tệp không hợp lệ.");
  }
  const compactTimestamp = timestamp.toISOString().replace(/[-:.]/g, "");
  return `BDG_LocalStorage_ReadOnly_Snapshot_${compactTimestamp}_${suffix}.json`;
}

export function getSnapshotLogCountDelta(
  snapshot: ReadOnlySnapshotSummary | null,
  baseline: MigrationPreviewReport | null
): number | null {
  if (
    !snapshot
    || !baseline
    || baseline.source !== "backup"
    || baseline.checksum.status !== "matched"
    || !baseline.structureValid
  ) {
    return null;
  }
  const capturedLogs = snapshot.groups.find((group) => group.group === "logs");
  const baselineLogs = baseline.groups.find((group) => group.group === "logs");
  if (!capturedLogs || capturedLogs.recordCount === null || !baselineLogs?.available) {
    return null;
  }
  return capturedLogs.recordCount - baselineLogs.total;
}

const REQUIRED_FIELDS: Record<MigrationDataGroup, Record<string, (value: unknown) => boolean>> = {
  classes: {
    id: isNonEmptyString,
    schoolId: isNonEmptyString,
    gradeId: isNonEmptyString,
    gradeLevel: isNumber,
    name: isNonEmptyString,
    academicYear: isNonEmptyString,
    status: isNonEmptyString,
  },
  logs: {
    id: isNonEmptyString,
    schoolId: isNonEmptyString,
    timestamp: isNonEmptyString,
    actorId: isNonEmptyString,
    actorRole: isNonEmptyString,
    action: isNonEmptyString,
    entity: isNonEmptyString,
    details: isString,
  },
  students: {
    id: isNonEmptyString,
    schoolId: isNonEmptyString,
    studentCode: isNonEmptyString,
    fullName: isNonEmptyString,
    gradeLevel: isNumber,
    classId: isNonEmptyString,
    academicYear: isNonEmptyString,
    status: isNonEmptyString,
  },
  teachers: {
    id: isNonEmptyString,
    schoolId: isNonEmptyString,
    fullName: isNonEmptyString,
    email: isNonEmptyString,
    status: isNonEmptyString,
  },
  users: {
    id: isNonEmptyString,
    schoolId: isNonEmptyString,
    email: isNonEmptyString,
    fullName: isNonEmptyString,
    role: isNonEmptyString,
    status: isNonEmptyString,
    permissions: isArray,
  },
  quizRecords: {
    id: isNonEmptyString,
    studentId: isNonEmptyString,
    studentCode: isNonEmptyString,
    fullName: isNonEmptyString,
    classId: isNonEmptyString,
    className: isNonEmptyString,
    gradeLevel: isNumber,
    totalQuestions: isNumber,
    correctCount: isNumber,
    scorePercentage: isNumber,
    completedAt: isNonEmptyString,
  },
};

const DEMO_QUIZ_RECORD_IDS = new Set([
  "res-seed-01",
  "res-seed-02",
  "res-seed-03",
  "res-seed-04",
  "res-seed-05",
  "res-seed-06",
  "res-seed-07",
  "res-seed-08",
  "res-seed-09",
  "res-seed-10",
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function normalizeChecksum(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fingerprint(
  salt: Uint8Array,
  group: MigrationDataGroup,
  id: string | undefined,
  index: number
): Promise<string> {
  const source = new TextEncoder().encode(`${group}:${id ?? `record-${index + 1}`}`);
  const input = new Uint8Array(salt.length + source.length);
  input.set(salt);
  input.set(source, salt.length);
  const digest = await sha256(input);
  return digest.slice(0, 20);
}

function emptyGroup(group: MigrationDataGroup, available: boolean): GroupPreview {
  return {
    group,
    total: 0,
    valid: 0,
    duplicate: 0,
    missingFields: 0,
    orphaned: 0,
    unverifiableRelations: 0,
    demo: 0,
    verified: 0,
    unknown: 0,
    notMigratable: 0,
    migrationEligible: 0,
    protectedValuesExcluded: 0,
    quarantined: 0,
    available,
  };
}

function createReport(
  source: MigrationPreviewReport["source"],
  actualChecksum: string | null,
  expectedChecksum: string | null,
  checksumStatus: MigrationPreviewReport["checksum"]["status"],
  sourceSchemaVersion: number | null,
  structureValid: boolean,
  groups: GroupPreview[],
  issues: PreviewIssue[],
  notices: string[]
): MigrationPreviewReport {
  const totals = groups.reduce(
    (result, group) => ({
      totalRecords: result.totalRecords + group.total,
      valid: result.valid + group.valid,
      duplicate: result.duplicate + group.duplicate,
      missingFields: result.missingFields + group.missingFields,
      orphaned: result.orphaned + group.orphaned,
      unverifiableRelations: result.unverifiableRelations + group.unverifiableRelations,
      demo: result.demo + group.demo,
      verified: result.verified + group.verified,
      unknown: result.unknown + group.unknown,
      notMigratable: result.notMigratable + group.notMigratable,
      migrationEligible: result.migrationEligible + group.migrationEligible,
      protectedValuesExcluded: result.protectedValuesExcluded + group.protectedValuesExcluded,
      quarantined: result.quarantined + group.quarantined,
    }),
    {
      totalRecords: 0,
      valid: 0,
      duplicate: 0,
      missingFields: 0,
      orphaned: 0,
      unverifiableRelations: 0,
      demo: 0,
      verified: 0,
      unknown: 0,
      notMigratable: 0,
      migrationEligible: 0,
      protectedValuesExcluded: 0,
      quarantined: 0,
    }
  );
  const checksumVerified = checksumStatus === "matched";

  return {
    schemaVersion: MIGRATION_PREVIEW_SCHEMA_VERSION,
    source,
    sourceSchemaVersion,
    checksum: {
      algorithm: "SHA-256",
      actual: actualChecksum,
      expected: expectedChecksum,
      status: checksumStatus,
    },
    structureValid,
    canConfirmInventory: checksumVerified && structureValid,
    totalGroups: groups.length,
    ...totals,
    groups,
    issues,
    notices,
  };
}

function blockedReport(
  source: MigrationPreviewReport["source"],
  actualChecksum: string | null,
  expectedChecksum: string | null,
  checksumStatus: MigrationPreviewReport["checksum"]["status"],
  code: string,
  message: string
): MigrationPreviewReport {
  return createReport(
    source,
    actualChecksum,
    expectedChecksum,
    checksumStatus,
    null,
    false,
    [],
    [{ group: "source", code, message }],
    []
  );
}

function groupDataFromLocalStorage(
  values: Array<{ key: string; rawValue: string | null }>
): { groups: GroupData; errors: string[] } {
  const groups: GroupData = {};
  const errors: string[] = [];

  for (const group of GROUPS) {
    const key = STORAGE_KEY_BY_GROUP[group];
    const entry = values.find((item) => item.key === key);
    if (!entry || entry.rawValue === null) {
      groups[group] = { available: false, records: [] };
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(entry.rawValue);
      if (!Array.isArray(parsed)) {
        errors.push(`Nhóm ${group} không có cấu trúc mảng.`);
        groups[group] = { available: true, records: [] };
        continue;
      }
      groups[group] = { available: true, records: parsed };
    } catch {
      errors.push(`JSON của nhóm ${group} không hợp lệ.`);
      groups[group] = { available: true, records: [] };
    }
  }

  return { groups, errors };
}

function groupDataFromBackup(parsed: unknown): { groups: GroupData; schemaVersion: number; errors: string[] } {
  const groups: GroupData = {};
  const errors: string[] = [];

  if (!isRecord(parsed)) {
    return { groups, schemaVersion: 0, errors: ["Gốc JSON phải là một object."] };
  }

  if (parsed.format === SAFE_SNAPSHOT_FORMAT) {
    return {
      groups,
      schemaVersion: 2,
      errors: ["Bản kiểm kê đã khử dữ liệu không phải backup nguồn và không thể dùng để migration."],
    };
  }

  if (parsed.format === RAW_BACKUP_FORMAT) {
    const entries = parsed.entries;
    if (
      parsed.schemaVersion !== 1
      || !isNonEmptyString(parsed.origin)
      || !isNonEmptyString(parsed.capturedAt)
      || !Number.isFinite(Date.parse(parsed.capturedAt))
      || !Array.isArray(entries)
      || parsed.keyCount !== ALLOWED_LOCAL_STORAGE_KEYS.length
      || entries.length !== ALLOWED_LOCAL_STORAGE_KEYS.length
    ) {
      return {
        groups,
        schemaVersion: 1,
        errors: ["Bản chụp LocalStorage không đúng schema hoặc thiếu thông tin bắt buộc."],
      };
    }

    const allowedKeys = new Set<string>(ALLOWED_LOCAL_STORAGE_KEYS);
    const seen = new Set<string>();
    for (const entry of entries) {
      if (!isRecord(entry) || !isString(entry.key) || !allowedKeys.has(entry.key)) {
        errors.push("Entry bản chụp không thuộc allowlist.");
        continue;
      }
      if (seen.has(entry.key)) {
        errors.push("Bản chụp có khóa được phép bị lặp.");
        continue;
      }
      seen.add(entry.key);
      const group = GROUPS.find((candidate) => STORAGE_KEY_BY_GROUP[candidate] === entry.key);
      if (!group) continue;
      if (entry.rawValue === null) {
        groups[group] = { available: false, records: [] };
        continue;
      }
      if (!isString(entry.rawValue)) {
        errors.push(`Raw value của nhóm ${group} không hợp lệ.`);
        continue;
      }
      try {
        const value: unknown = JSON.parse(entry.rawValue);
        if (!Array.isArray(value)) {
          errors.push(`Nhóm ${group} không có cấu trúc mảng.`);
          groups[group] = { available: true, records: [] };
          continue;
        }
        groups[group] = { available: true, records: value };
      } catch {
        errors.push(`JSON của nhóm ${group} không hợp lệ.`);
        groups[group] = { available: true, records: [] };
      }
    }

    if (seen.size !== ALLOWED_LOCAL_STORAGE_KEYS.length) {
      errors.push("Bản chụp thiếu một hoặc nhiều khóa trong allowlist.");
    }
    return { groups, schemaVersion: 1, errors };
  }

  if (isRecord(parsed.payload) && parsed.payload.format === RAW_BACKUP_FORMAT) {
    const payload = parsed.payload;
    const entries = payload.entries;
    if (
      (parsed.schemaVersion !== undefined && parsed.schemaVersion !== null && parsed.schemaVersion !== 1)
      || !Array.isArray(entries)
      || !Number.isInteger(payload.keyCount)
      || payload.keyCount !== entries.length
    ) {
      return {
        groups,
        schemaVersion: 1,
        errors: ["Envelope backup raw không đúng schema version hoặc số lượng entries."],
      };
    }

    const allowedKeys = new Set<string>(ALLOWED_LOCAL_STORAGE_KEYS);
    const seen = new Set<string>();
    let includedEntries = 0;
    for (const entry of entries) {
      if (!isRecord(entry) || !isString(entry.key)) {
        errors.push("Entry backup thiếu khóa hợp lệ.");
        continue;
      }
      if (!allowedKeys.has(entry.key)) continue;
      if (seen.has(entry.key)) {
        errors.push("Backup có khóa dữ liệu được phép bị lặp.");
        continue;
      }
      seen.add(entry.key);
      includedEntries += 1;
      if (!isString(entry.rawValue)) {
        errors.push(`Raw value của nhóm ${entry.key} không hợp lệ.`);
        continue;
      }
      const group = GROUPS.find((candidate) => STORAGE_KEY_BY_GROUP[candidate] === entry.key);
      if (!group) continue;
      try {
        const value: unknown = JSON.parse(entry.rawValue);
        if (!Array.isArray(value)) {
          errors.push(`Nhóm ${group} không có cấu trúc mảng.`);
          groups[group] = { available: true, records: [] };
          continue;
        }
        groups[group] = { available: true, records: value };
      } catch {
        errors.push(`JSON của nhóm ${group} không hợp lệ.`);
        groups[group] = { available: true, records: [] };
      }
    }

    if (includedEntries === 0) errors.push("Backup không có khóa nào thuộc phạm vi D-3.");
    return { groups, schemaVersion: 1, errors };
  }

  if (parsed.schemaVersion !== 1) {
    return { groups, schemaVersion: 0, errors: ["Schema version của backup không được hỗ trợ."] };
  }

  const studentRecords = parsed.studentRecords;
  if (
    !Array.isArray(parsed.classes)
    || !Array.isArray(parsed.logs)
    || !Array.isArray(parsed.students)
    || !Array.isArray(parsed.teachers)
    || !isRecord(studentRecords)
    || !Array.isArray(studentRecords.quizRecords)
  ) {
    return {
      groups,
      schemaVersion: 1,
      errors: ["Backup ứng dụng thiếu một hoặc nhiều nhóm dữ liệu bắt buộc."],
    };
  }

  groups.classes = { available: true, records: parsed.classes };
  groups.logs = { available: true, records: parsed.logs };
  groups.students = { available: true, records: parsed.students };
  groups.teachers = { available: true, records: parsed.teachers };
  groups.quizRecords = { available: true, records: studentRecords.quizRecords };

  if (Object.prototype.hasOwnProperty.call(parsed, "users")) {
    if (!Array.isArray(parsed.users)) {
      errors.push("Phần tài khoản trong backup không có cấu trúc mảng.");
    } else {
      groups.users = { available: true, records: parsed.users };
    }
  } else {
    groups.users = { available: false, records: [] };
  }

  return { groups, schemaVersion: 1, errors };
}

function getId(record: UnknownRecord): string | undefined {
  return isNonEmptyString(record.id) ? record.id : undefined;
}

function getSchoolId(record: UnknownRecord): string | undefined {
  return isNonEmptyString(record.schoolId) ? record.schoolId : undefined;
}

function getYear(record: UnknownRecord): string | undefined {
  return isNonEmptyString(record.academicYear) ? record.academicYear : undefined;
}

function classify(group: MigrationDataGroup, record: UnknownRecord): DataClassification {
  const id = getId(record);
  if (group === "quizRecords" && id && DEMO_QUIZ_RECORD_IDS.has(id)) return "DEMO";
  return "UNKNOWN";
}

function validateRelations(
  recordsByGroup: Record<MigrationDataGroup, ClassifiedRecord[]>
): void {
  const classes = recordsByGroup.classes.map((item) => item.record);
  const students = recordsByGroup.students.map((item) => item.record);
  const teachers = recordsByGroup.teachers.map((item) => item.record);

  const findClass = (classId: unknown, schoolId: unknown, year?: unknown) =>
    classes.find((item) =>
      item.id === classId
      && item.schoolId === schoolId
      && (year === undefined || item.academicYear === year)
    );

  for (const item of recordsByGroup.students) {
    const student = item.record;
    if (!findClass(student.classId, student.schoolId, student.academicYear)) item.orphaned = true;
  }

  for (const item of recordsByGroup.teachers) {
    const teacher = item.record;
    if (
      isNonEmptyString(teacher.homeroomClassId)
      && !findClass(teacher.homeroomClassId, teacher.schoolId)
    ) {
      item.orphaned = true;
    }
  }

  for (const item of recordsByGroup.classes) {
    const schoolClass = item.record;
    if (
      isNonEmptyString(schoolClass.homeroomTeacherId)
      && !teachers.some((teacher) =>
        teacher.id === schoolClass.homeroomTeacherId
        && teacher.schoolId === schoolClass.schoolId
      )
    ) {
      item.orphaned = true;
    }
  }

  for (const item of recordsByGroup.quizRecords) {
    const result = item.record;
    const student = students.find((candidate) => candidate.id === result.studentId);
    const schoolClass = classes.find((candidate) => candidate.id === result.classId);

    if (!student || !schoolClass) {
      item.orphaned = true;
      continue;
    }

    if (
      student.classId !== result.classId
      || student.schoolId !== schoolClass.schoolId
    ) {
      item.unverifiable = true;
    }
  }
}

async function analyzeGroups(
  source: MigrationPreviewReport["source"],
  checksum: {
    actual: string;
    expected: string | null;
    status: MigrationPreviewReport["checksum"]["status"];
  },
  sourceSchemaVersion: number | null,
  inputGroups: GroupData,
  structureErrors: string[]
): Promise<MigrationPreviewReport> {
  const recordIssues: PreviewIssue[] = [];
  const recordsByGroup = {} as Record<MigrationDataGroup, ClassifiedRecord[]>;
  const groupReports: GroupPreview[] = [];
  const fingerprintCache = new Map<string, string>();
  const fingerprintSalt = globalThis.crypto.getRandomValues(new Uint8Array(16));

  for (const group of GROUPS) {
    const sourceGroup = inputGroups[group] ?? { available: false, records: [] };
    const items: ClassifiedRecord[] = sourceGroup.records.map((value, index) => {
      if (!isRecord(value)) {
        return {
          record: {},
          index,
          classification: "UNKNOWN",
          missingFields: ["record"],
          invalid: true,
          duplicate: false,
          orphaned: false,
          unverifiable: false,
          notMigratable: group === "users",
        };
      }
      const missingFields = Object.entries(REQUIRED_FIELDS[group])
        .filter(([field, validate]) => !validate(value[field]))
        .map(([field]) => field);
      return {
        record: value,
        index,
        classification: classify(group, value),
        missingFields,
        invalid: false,
        duplicate: false,
        orphaned: false,
        unverifiable: false,
        notMigratable: group === "users",
      };
    });

    const ids = new Map<string, number>();
    for (const item of items) {
      const id = getId(item.record);
      if (id) ids.set(id, (ids.get(id) ?? 0) + 1);
    }
    for (const item of items) {
      const id = getId(item.record);
      if (id && (ids.get(id) ?? 0) > 1) item.duplicate = true;
    }
    recordsByGroup[group] = items;
  }

  const studentCodes = new Map<string, ClassifiedRecord[]>();
  for (const item of recordsByGroup.students) {
    const student = item.record;
    if (!isNonEmptyString(student.studentCode)) continue;
    const normalizedCode = student.studentCode.trim().toLocaleUpperCase();
    const key = `${String(student.schoolId)}|${String(student.academicYear)}|${normalizedCode}`;
    studentCodes.set(key, [...(studentCodes.get(key) ?? []), item]);
  }
  for (const duplicates of studentCodes.values()) {
    if (duplicates.length > 1) duplicates.forEach((item) => { item.duplicate = true; });
  }

  validateRelations(recordsByGroup);

  for (const group of GROUPS) {
    const items = recordsByGroup[group];
    const report = emptyGroup(group, inputGroups[group]?.available ?? false);
    report.total = items.length;

    for (const item of items) {
      const id = getId(item.record);
      const key = `${group}:${id ?? `record-${item.index + 1}`}`;
      let idFingerprint = fingerprintCache.get(key);
      if (!idFingerprint) {
        idFingerprint = await fingerprint(fingerprintSalt, group, id, item.index);
        fingerprintCache.set(key, idFingerprint);
      }

      if (item.classification === "DEMO") report.demo += 1;
      else if (item.classification === "VERIFIED") report.verified += 1;
      else report.unknown += 1;

      if (item.notMigratable) report.notMigratable += 1;
      if (group === "classes" && Object.prototype.hasOwnProperty.call(item.record, "accessCode")) {
        report.protectedValuesExcluded += 1;
      }
      if (group === "users") {
        if (Object.prototype.hasOwnProperty.call(item.record, "passwordHash")) report.protectedValuesExcluded += 1;
        if (Object.prototype.hasOwnProperty.call(item.record, "salt")) report.protectedValuesExcluded += 1;
      }
      if (item.missingFields.length > 0 || item.invalid) {
        report.missingFields += 1;
        recordIssues.push({
          group,
          code: item.invalid ? "invalid_record" : "missing_or_invalid_fields",
          sourceIdFingerprint: idFingerprint,
          fields: item.missingFields,
          message: "Bản ghi thiếu trường bắt buộc hoặc sai cấu trúc.",
        });
      }
      if (item.duplicate) {
        report.duplicate += 1;
        recordIssues.push({
          group,
          code: "duplicate_id_or_student_code",
          sourceIdFingerprint: idFingerprint,
          message: "Phát hiện ID trùng hoặc mã học sinh trùng trong cùng trường/năm.",
        });
      }
      if (item.orphaned) {
        report.orphaned += 1;
        recordIssues.push({
          group,
          code: "orphaned_relationship",
          sourceIdFingerprint: idFingerprint,
          message: "Không tìm thấy quan hệ lớp, giáo viên hoặc học sinh tương ứng.",
        });
      }
      if (item.unverifiable) {
        report.unverifiableRelations += 1;
        recordIssues.push({
          group,
          code: "historical_relationship_unverifiable",
          sourceIdFingerprint: idFingerprint,
          message: "Quan hệ lớp hiện tại khác snapshot; thiếu lịch sử enrollment để xác minh.",
        });
      }

      const isValid =
        !item.invalid
        && item.missingFields.length === 0
        && !item.duplicate
        && !item.orphaned
        && !item.unverifiable;
      if (isValid) report.valid += 1;
      if (item.classification === "VERIFIED" && isValid && !item.notMigratable) {
        report.migrationEligible += 1;
      }
      if (
        item.classification !== "VERIFIED"
        || !isValid
        || item.notMigratable
      ) {
        report.quarantined += 1;
      }
    }
    groupReports.push(report);
  }

  const structureValid = structureErrors.length === 0;
  const structureIssues: PreviewIssue[] = structureErrors.map((message) => ({
    group: "source",
    code: "invalid_structure",
    message,
  }));
  const notices = [
    "Không có hồ sơ nào được tự động phân loại VERIFIED; cần bằng chứng nguồn độc lập.",
    "Các ID chỉ xuất hiện dưới dạng fingerprint có salt ngẫu nhiên theo phiên; không thể đối chiếu trực tiếp giữa các báo cáo.",
    "Không có tên, mã học sinh, email, số điện thoại hoặc nội dung cá nhân trong báo cáo.",
    "Tài khoản và dữ liệu credential không đủ điều kiện chuyển; chỉ số lượng được thống kê.",
    "Các giá trị bị bảo vệ được đếm riêng nhưng không hiển thị hoặc xuất báo cáo.",
    "Khóa phiên không nằm trong allowlist nên không được đọc.",
    "Các nhóm khác trong backup ngoài phạm vi D-3 không được đưa vào báo cáo.",
    "Quan hệ khối không được kiểm tra vì khóa LocalStorage khối không nằm trong phạm vi được phép đọc.",
    "Checksum backup được so với hash bên ngoài của toàn bộ byte tệp; checksum nhúng trong envelope không được xem là nguồn chuẩn.",
  ];

  return createReport(
    source,
    checksum.actual,
    checksum.expected,
    checksum.status,
    sourceSchemaVersion,
    structureValid,
    groupReports,
    [...structureIssues, ...recordIssues],
    notices
  );
}

export async function inspectLocalStorage(
  storage: StorageReader,
  expectedChecksum?: string
): Promise<MigrationPreviewReport> {
  let values: Array<{ key: string; rawValue: string | null }>;
  try {
    values = ALLOWED_LOCAL_STORAGE_KEYS.map((key) => ({
      key,
      rawValue: storage.getItem(key),
    }));
  } catch {
    return blockedReport(
      "localStorage",
      null,
      null,
      "baseline_missing",
      "storage_read_failed",
      "Không thể đọc một hoặc nhiều khóa LocalStorage được cho phép."
    );
  }

  const serializedSnapshot = JSON.stringify(values);
  const actual = await sha256(new TextEncoder().encode(serializedSnapshot));
  const normalizedExpected = expectedChecksum === undefined ? null : normalizeChecksum(expectedChecksum);
  if (expectedChecksum !== undefined && normalizedExpected === null) {
    return blockedReport(
      "localStorage",
      actual,
      null,
      "invalid_expected",
      "invalid_expected_checksum",
      "Checksum chuẩn phải có 64 ký tự hexadecimal."
    );
  }
  if (normalizedExpected && normalizedExpected !== actual) {
    return blockedReport(
      "localStorage",
      actual,
      normalizedExpected,
      "mismatch",
      "checksum_mismatch",
      "Checksum không khớp; công cụ từ chối xác nhận và không phân tích bản ghi."
    );
  }

  const parsed = groupDataFromLocalStorage(values);
  return analyzeGroups(
    "localStorage",
    {
      actual,
      expected: normalizedExpected,
      status: normalizedExpected ? "matched" : "baseline_missing",
    },
    null,
    parsed.groups,
    parsed.errors
  );
}

export async function inspectBackupBytes(
  bytes: Uint8Array,
  expectedChecksum: string
): Promise<MigrationPreviewReport> {
  const actual = await sha256(bytes);
  const normalizedExpected = normalizeChecksum(expectedChecksum);
  if (!normalizedExpected) {
    return blockedReport(
      "backup",
      actual,
      null,
      "invalid_expected",
      "invalid_expected_checksum",
      "Cần checksum SHA-256 chuẩn 64 ký tự hexadecimal để xác nhận backup."
    );
  }
  if (normalizedExpected !== actual) {
    return blockedReport(
      "backup",
      actual,
      normalizedExpected,
      "mismatch",
      "checksum_mismatch",
      "Checksum không khớp; công cụ từ chối xác nhận và không phân tích backup."
    );
  }

  let parsed: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    parsed = JSON.parse(text);
  } catch {
    return blockedReport(
      "backup",
      actual,
      normalizedExpected,
      "matched",
      "invalid_json",
      "Tệp không phải JSON UTF-8 hợp lệ."
    );
  }

  const extracted = groupDataFromBackup(parsed);
  return analyzeGroups(
    "backup",
    { actual, expected: normalizedExpected, status: "matched" },
    extracted.schemaVersion,
    extracted.groups,
    extracted.errors
  );
}
