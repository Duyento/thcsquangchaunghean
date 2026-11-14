import { test as nodeTest } from "node:test";
import * as assert from "node:assert/strict";
import { adminService, BACKUP_SCHEMA_VERSION } from "../src/services/adminService";
import { createStudentToken, createTamperProofToken, hashPassword } from "../src/services/cryptoService";
import {
  ActivityLog,
  AdminPermission,
  SchoolClass,
  StoredUserAccount,
  Student,
  StudentSession,
  UserAccount,
  UserRole,
} from "../src/types/adminTypes";
import * as XLSX from "xlsx";
import { competitionService, readContestantExcel } from "../src/services/competitionService";
import { studentService } from "../src/services/studentService";
import { COMPETITION_STORAGE_KEY, Competition, CompetitionScoringMode, ContestantImportRow } from "../src/types/competitionTypes";
import { decryptBackupPayload, encryptBackupPayload } from "../src/services/secureBackup";
import {
  saveBackupToArchive,
  verifyArchivedBackup,
  type BackupArchive,
  type BackupArchiveRecord,
} from "../src/services/backupArchive";

const USERS_KEY = "thcs_quang_chau_admin_users";
const SESSION_KEY = "thcs_quang_chau_admin_session";
const STUDENT_SESSION_KEY = "thcs_quang_chau_student_session";
const SCHOOL_KEY = "thcs_quang_chau_admin_school";
const GRADES_KEY = "thcs_quang_chau_admin_grades";
const CLASSES_KEY = "thcs_quang_chau_admin_classes";
const TEACHERS_KEY = "thcs_quang_chau_admin_teachers";
const STUDENTS_KEY = "thcs_quang_chau_admin_students";
const LOGS_KEY = "thcs_quang_chau_admin_logs";
const QUIZ_RESULTS_KEY = "thcs_quang_chau_student_quiz_records";
const STUDENT_PLEDGES_KEY = "bdg_student_pledges";

const values = new Map<string, string>();
let failKey: string | null = null;
let failCount = 0;
let failOperation: "set" | "remove" | null = null;
let failAfterSetCount = 0;
let failReadAfterSetCount = 0;
let failReadCount = 0;
let mismatchReadAfterSetCount = 0;
let mismatchReadCount = 0;
let rollbackSetFailureCount = 0;
let writeFailureTriggered = false;
let valueAtAfterSetFailure: string | null = null;
let writeLockUnavailable = false;
const superAdminPassword = "VerifiedAdminPassword123";
const BACKUP_PASSWORD = "fixture-only-backup-password";
let testQueue = Promise.resolve();

function test(name: string, run: () => void | Promise<void>): void {
  nodeTest(name, async () => {
    let release!: () => void;
    const previous = testQueue;
    testQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      values.clear();
      failKey = null;
      failCount = 0;
      failOperation = null;
      failAfterSetCount = 0;
      failReadAfterSetCount = 0;
      failReadCount = 0;
      mismatchReadAfterSetCount = 0;
      mismatchReadCount = 0;
      rollbackSetFailureCount = 0;
      writeFailureTriggered = false;
      valueAtAfterSetFailure = null;
      writeLockUnavailable = false;
      installFakeStorage();
      await run();
    } finally {
      release();
    }
  });
}

function installFakeStorage(): void {
  const localStorage = {
    getItem(key: string) {
      if (key === failKey && failReadCount > 0) {
        failReadCount -= 1;
        throw new Error("Simulated storage read failure");
      }
      if (key === failKey && mismatchReadCount > 0) {
        mismatchReadCount -= 1;
        return "simulated-mismatched-value";
      }
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (key === failKey && failOperation !== "remove" && failCount > 0) {
        failCount -= 1;
        writeFailureTriggered = true;
        throw new Error("Simulated storage write failure");
      }
      if (key === failKey && writeFailureTriggered && rollbackSetFailureCount > 0) {
        rollbackSetFailureCount -= 1;
        throw new Error("Simulated rollback write failure");
      }
      values.set(key, value);
      if (key === failKey && failAfterSetCount > 0) {
        failAfterSetCount -= 1;
        writeFailureTriggered = true;
        valueAtAfterSetFailure = values.get(key) ?? null;
        throw new Error("Simulated write failure after mutation");
      }
      if (key === failKey && failReadAfterSetCount > 0) {
        failReadAfterSetCount -= 1;
        failReadCount += 1;
      }
      if (key === failKey && mismatchReadAfterSetCount > 0) {
        mismatchReadAfterSetCount -= 1;
        mismatchReadCount += 1;
      }
    },
    removeItem(key: string) {
      if (key === failKey && failOperation === "remove") {
        throw new Error("Simulated storage remove failure");
      }
      values.delete(key);
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { document: {}, localStorage },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      locks: {
        request: async (_name: string, _options: unknown, callback: (lock: object | null) => unknown) =>
          callback(writeLockUnavailable ? null : {}),
      },
    },
  });
}

function setValue(key: string, value: unknown): void {
  values.set(key, JSON.stringify(value));
}

function getValue<T>(key: string): T | null {
  const value = values.get(key);
  return value === undefined ? null : JSON.parse(value) as T;
}

function makeActivityLogs(count: number): ActivityLog[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `existing-log-${index}`,
    schoolId: "test-school",
    timestamp: "2026-01-01T00:00:00.000Z",
    actorId: "existing-actor",
    actorName: "Existing Actor",
    actorRole: "admin" as UserRole,
    action: "EXISTING_ACTION",
    entity: "system" as ActivityLog["entity"],
    details: "Existing test entry",
  }));
}

function seedLogActor(
  role: Exclude<UserRole, "student"> = "admin",
  permissions: AdminPermission[] = []
): StoredUserAccount {
  const user: StoredUserAccount = {
    id: `test-${role}`,
    schoolId: "test-school",
    email: `${role}@example.test`,
    fullName: "Test Log Actor",
    role,
    passwordHash: "test-password-hash",
    salt: "test-salt",
    status: "active",
    permissions,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "test",
  };
  const expiresAt = Date.now() + 60 * 60 * 1000;
  setValue(USERS_KEY, [user]);
  setValue(SESSION_KEY, {
    userId: user.id,
    token: createTamperProofToken(user.id, expiresAt),
    expiresAt,
  });
  return user;
}

function makeTestStudent(): Student {
  return {
    id: "test-student",
    schoolId: "test-school",
    studentCode: "TEST-001",
    fullName: "Test Student",
    gender: "nam",
    birthDate: "2011-01-01",
    gradeLevel: 6,
    classId: "test-class",
    className: "6A",
    academicYear: "2025-2026",
    status: "studying",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "test",
  };
}

function makeTestClass(): SchoolClass {
  return {
    id: "test-class",
    schoolId: "test-school",
    gradeId: "test-grade",
    gradeLevel: 6,
    name: "6A",
    academicYear: "2025-2026",
    studentCount: 1,
    status: "active",
    accessCode: "TEST-CLASS-CODE",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "test",
  };
}

async function seedSuperAdmin(): Promise<StoredUserAccount> {
  const salt = "0123456789abcdef0123456789abcdef";
  const user: StoredUserAccount = {
    id: "test-super-admin",
    schoolId: "test-school",
    email: "admin@example.test",
    fullName: "Test Administrator",
    role: "super_admin",
    passwordHash: await hashPassword(superAdminPassword, salt),
    salt,
    status: "active",
    permissions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "test",
  };
  setValue(USERS_KEY, [user]);
  const expiresAt = Date.now() + 60 * 60 * 1000;
  setValue(SESSION_KEY, {
    userId: user.id,
    token: createTamperProofToken(user.id, expiresAt),
    expiresAt,
  });
  return user;
}

test("class deletion is blocked while students depend on the class", async () => {
  const admin = await seedSuperAdmin();
  const originalStudents = adminService.getInternalStudents();
  const result = await adminService.deleteClass(admin, "class-6a1");

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /học sinh/i);
  assert.equal(adminService.getClasses().some((schoolClass) => schoolClass.id === "class-6a1"), true);
  assert.deepEqual(adminService.getInternalStudents(), originalStudents);
});

test("class deletion is blocked by historical records and keeps all records intact", async () => {
  const admin = await seedSuperAdmin();
  const created = await adminService.createClass(admin, { name: "6B8", gradeLevel: 6 });
  assert.equal(created.success, true);
  const history = [{ id: "quiz-1", classId: created.schoolClass!.id, scorePercentage: 90 }];
  const pledges = [{ id: "pledge-1", className: created.schoolClass!.name }];
  setValue(QUIZ_RESULTS_KEY, history);
  setValue(STUDENT_PLEDGES_KEY, pledges);

  const result = await adminService.deleteClass(admin, created.schoolClass!.id);

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /lịch sử/i);
  assert.equal(adminService.getClasses().some((schoolClass) => schoolClass.id === created.schoolClass!.id), true);
  assert.deepEqual(getValue(QUIZ_RESULTS_KEY), history);
  assert.deepEqual(getValue(STUDENT_PLEDGES_KEY), pledges);
});

test("an unassigned, empty class can be deleted without removing historical logs", async () => {
  const admin = await seedSuperAdmin();
  const created = await adminService.createClass(admin, { name: "6B7", gradeLevel: 6 });
  assert.equal(created.success, true);
  const classId = created.schoolClass!.id;

  const result = await adminService.deleteClass(admin, classId);

  assert.equal(result.success, true);
  assert.equal(adminService.getClasses().some((schoolClass) => schoolClass.id === classId), false);
  assert.equal(adminService.getActivityLogs(admin).some((log) => log.entityId === classId && log.action === "DELETE_CLASS"), true);
});

test("archiving a class requires no deletion and preserves student and quiz records", async () => {
  const admin = await seedSuperAdmin();
  const students = adminService.getInternalStudents();
  const records = [{ id: "quiz-1", classId: "class-6a1" }];
  setValue(QUIZ_RESULTS_KEY, records);

  const archived = await adminService.setClassArchived(admin, "class-6a1", true);

  assert.equal(archived.success, true);
  assert.equal(adminService.getClasses().find((schoolClass) => schoolClass.id === "class-6a1")?.status, "archived");
  assert.deepEqual(adminService.getInternalStudents(), students);
  assert.deepEqual(getValue(QUIZ_RESULTS_KEY), records);
  assert.equal((await adminService.setClassArchived(admin, "class-6a1", false)).success, true);
  assert.equal(adminService.getClasses().find((schoolClass) => schoolClass.id === "class-6a1")?.status, "active");
});

test("class deletion rolls back when class storage cannot be updated", async () => {
  const admin = await seedSuperAdmin();
  const created = await adminService.createClass(admin, { name: "6B6", gradeLevel: 6 });
  assert.equal(created.success, true);
  const classId = created.schoolClass!.id;
  const originalLogs = getValue(LOGS_KEY);
  failKey = CLASSES_KEY;
  failOperation = "set";
  failCount = 1;

  const result = await adminService.deleteClass(admin, classId);

  assert.equal(result.success, false);
  assert.equal(adminService.getClasses().some((schoolClass) => schoolClass.id === classId), true);
  assert.deepEqual(getValue(LOGS_KEY), originalLogs);
});

function backupFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 2,
    school: {
      id: "backup-school",
      name: "Backup School",
      code: "BKP",
      province: "Test",
      district: "Test",
      academicYear: "2026-2027",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      status: "active",
    },
    grades: [{ id: "grade-backup", name: "Grade 6", academicYear: "2026-2027" }],
    classes: [{ id: "class-backup", gradeId: "grade-backup", name: "6A", academicYear: "2026-2027" }],
    teachers: [{ id: "teacher-backup", fullName: "Backup Teacher", email: "teacher@example.test" }],
    students: [{ id: "student-backup", studentCode: "S-1", fullName: "Backup Student", classId: "class-backup" }],
    logs: [],
    content: { questions: [], posts: [], videos: [], albums: [], images: [] },
    studentRecords: { quizRecords: [], pledges: [] },
    ...overrides,
  };
}

function encryptedFixture(backup = backupFixture()): Promise<string> {
  return encryptBackupPayload(backup, BACKUP_PASSWORD);
}

function competitionInput(
  overrides: Partial<Omit<Competition, "id" | "schoolId" | "createdAt" | "updatedAt" | "status">> = {}
) {
  const startsAt = new Date(Date.now() + 60_000).toISOString();
  const endsAt = new Date(Date.now() + 86_400_000).toISOString();
  return {
    name: "Cuộc thi thử",
    description: "Dữ liệu giả",
    rules: "Thể lệ thử",
    eligibleParticipants: "Học sinh",
    startsAt,
    endsAt,
    scoringMode: "total" as CompetitionScoringMode,
    criteria: [],
    allowMultipleSubmissions: false,
    ...overrides,
  };
}

test("bootstrap refuses to create a Super Admin without trusted ownership verification", async () => {
  const result = await adminService.initializeSuperAdmin(
    "Test Admin",
    "admin@example.test",
    "FakePassword123"
  );
  assert.equal(result.success, false);
  assert.match(result.error ?? "", /không thể xác minh quyền quản trị/i);
  assert.equal(values.has(USERS_KEY), false);
  assert.equal(adminService.isSystemInitialized(), false);
});

test("existing teacher accounts can still authenticate without default account creation", async () => {
  const salt = "fedcba9876543210fedcba9876543210";
  const teacher: StoredUserAccount = {
    id: "test-teacher",
    schoolId: "test-school",
    email: "teacher@example.test",
    fullName: "Test Teacher",
    role: "teacher",
    passwordHash: await hashPassword("TeacherPassword123", salt),
    salt,
    status: "active",
    permissions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "test",
  };
  setValue(USERS_KEY, [teacher]);

  const result = await adminService.authenticate(teacher.email, "TeacherPassword123");

  assert.equal(result.success, true);
  assert.equal(result.user?.role, "teacher");
  assert.equal(result.user && "passwordHash" in result.user, false);
  assert.equal(getValue<StoredUserAccount[]>(USERS_KEY)?.length, 1);
  const usersBeforeRecovery = getValue<StoredUserAccount[]>(USERS_KEY);
  await assert.rejects(
    adminService.recoverAccountPassword(result.user!, teacher.id, "x", "NewPassword123", "NewPassword123"),
    /chỉ dành riêng cho Admin chính/i
  );
  assert.deepEqual(getValue(USERS_KEY), usersBeforeRecovery);
});

test("pending accounts cannot authenticate or change stored account data", async () => {
  const salt = "0123456789abcdef0123456789abcdef";
  const pendingUser: StoredUserAccount = {
    id: "pending-admin",
    schoolId: "test-school",
    email: "pending@example.test",
    fullName: "Pending User",
    role: "admin",
    passwordHash: await hashPassword("PendingPassword123", salt),
    salt,
    status: "pending",
    permissions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "test",
  };
  setValue(USERS_KEY, [pendingUser]);
  const originalUsers = getValue<StoredUserAccount[]>(USERS_KEY);

  const result = await adminService.authenticate(pendingUser.email, "PendingPassword123");

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /đang chờ phê duyệt/i);
  assert.deepEqual(getValue(USERS_KEY), originalUsers);
  assert.equal(values.has(SESSION_KEY), false);
  assert.equal(values.has(LOGS_KEY), false);
});

test("locked accounts remain unable to authenticate", async () => {
  const salt = "0123456789abcdef0123456789abcdef";
  const lockedUser: StoredUserAccount = {
    id: "locked-account",
    schoolId: "test-school",
    email: "locked@example.test",
    fullName: "Locked User",
    role: "teacher",
    passwordHash: await hashPassword("LockedPassword123", salt),
    salt,
    status: "locked",
    permissions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "test",
  };
  setValue(USERS_KEY, [lockedUser]);
  const originalUsers = getValue<StoredUserAccount[]>(USERS_KEY);

  const result = await adminService.authenticate(lockedUser.email, "LockedPassword123");

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /đã bị khóa/i);
  assert.deepEqual(getValue(USERS_KEY), originalUsers);
  assert.equal(values.has(SESSION_KEY), false);
  assert.equal(values.has(LOGS_KEY), false);
});

test("existing sub-admin accounts authenticate only with the correct password", async () => {
  const salt = "abcdef0123456789abcdef0123456789";
  const subAdmin: StoredUserAccount = {
    id: "existing-sub-admin",
    schoolId: "test-school",
    email: "subadmin@example.test",
    fullName: "Existing Sub Admin",
    role: "admin",
    passwordHash: await hashPassword("SubAdminPassword123", salt),
    salt,
    status: "active",
    permissions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "test",
  };
  setValue(USERS_KEY, [subAdmin]);
  const originalUsers = getValue<StoredUserAccount[]>(USERS_KEY);

  const failedLogin = await adminService.authenticate(subAdmin.email, "WrongPassword123");
  assert.equal(failedLogin.success, false);
  assert.deepEqual(getValue(USERS_KEY), originalUsers);
  assert.equal(values.has(SESSION_KEY), false);
  assert.equal(values.has(LOGS_KEY), false);

  const successfulLogin = await adminService.authenticate(subAdmin.email, "SubAdminPassword123");
  assert.equal(successfulLogin.success, true);
  assert.equal(successfulLogin.user?.role, "admin");
  assert.equal("passwordHash" in successfulLogin.user!, false);
  assert.equal("salt" in successfulLogin.user!, false);
});

test("a forged Super Admin actor without an active session cannot create accounts", async () => {
  const forgedActor: UserAccount = {
    id: "forged",
    schoolId: "test-school",
    email: "forged@example.test",
    fullName: "Forged Admin",
    role: "super_admin",
    status: "active",
    permissions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "test",
  };

  await assert.rejects(
    adminService.createSubAdmin(forgedActor, {
      fullName: "Fake Admin",
      email: "fake@example.test",
      plainPassword: "FakePassword123",
      permissions: [],
    }),
    /chỉ dành riêng cho Admin chính/i
  );
  assert.equal(values.has(USERS_KEY), false);
});

test("valid password hashes still authenticate without automatic account creation", async () => {
  const user = await seedSuperAdmin();
  const originalHash = user.passwordHash;
  const result = await adminService.authenticate(user.email, superAdminPassword);

  assert.equal(result.success, true);
  assert.equal(getValue<StoredUserAccount[]>(USERS_KEY)?.[0].passwordHash, originalHash);
  assert.equal(result.user && "passwordHash" in result.user, false);
  assert.equal(result.user && "salt" in result.user, false);
  assert.equal("passwordHash" in adminService.getCurrentSessionUser()!, false);
  assert.equal("salt" in adminService.getSuperAdmin()!, false);
  assert.equal("salt" in adminService.getUsers(user)[0], false);

  const reloaded = adminService.getCurrentSessionUser();
  assert.equal(reloaded?.id, user.id);
  adminService.logout();
  assert.equal(adminService.getCurrentSessionUser(), null);

  values.delete(USERS_KEY);
  const missing = await adminService.authenticate("admin@example.test", superAdminPassword);
  assert.equal(missing.success, false);
  assert.equal(values.has(USERS_KEY), false);
  const initialization = await adminService.initializeSuperAdmin(
    "Unexpected Administrator",
    "new-admin@example.test",
    "AnotherPassword123"
  );
  assert.equal(initialization.success, false);
  assert.equal(values.has(USERS_KEY), false);
});

test("failed authentication storage write returns failure and rolls back user/session state", async () => {
  const user = await seedSuperAdmin();
  const previousUsers = getValue<StoredUserAccount[]>(USERS_KEY);
  failKey = SESSION_KEY;
  failCount = 1;
  failOperation = "set";

  const result = await adminService.authenticate(user.email, superAdminPassword);

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /không thể hoàn tất đăng nhập an toàn/i);
  assert.deepEqual(getValue(USERS_KEY), previousUsers);
  assert.equal(values.has(LOGS_KEY), false);
  assert.notEqual(getValue(SESSION_KEY), null);
});

test("protected credential placeholders are detected and never authenticated", async () => {
  const user = await seedSuperAdmin();
  const protectedUser = { ...user, passwordHash: "[PROTECTED]", salt: "[PROTECTED]" };
  setValue(USERS_KEY, [protectedUser]);

  const result = await adminService.authenticate(user.email, superAdminPassword);
  assert.equal(result.success, false);
  assert.match(result.error ?? "", /không hợp lệ/i);
  assert.deepEqual(getValue(USERS_KEY), [protectedUser]);
});

test("restore ignores protected account data and preserves existing accounts", async () => {
  const user = await seedSuperAdmin();
  const protectedUser = { ...user, passwordHash: "[PROTECTED]", salt: "[PROTECTED]" };
  setValue(USERS_KEY, [protectedUser]);
  const result = await adminService.restoreBackup(
    user,
    await encryptedFixture(backupFixture({ users: [protectedUser] })),
    BACKUP_PASSWORD
  );

  assert.equal(result.success, true);
  assert.match(result.message, /\[PROTECTED\]/);
  assert.deepEqual(getValue(USERS_KEY), [protectedUser]);
  assert.equal(getValue<Array<{ id: string }>>(CLASSES_KEY)?.[0].id, "class-backup");
  assert.equal(getValue<Array<{ id: string }>>(STUDENTS_KEY)?.[0].id, "student-backup");
  assert.equal(getValue<Array<{ id: string }>>(TEACHERS_KEY)?.[0].id, "teacher-backup");
});

test("invalid backup structure does not change students, teachers, or classes", async () => {
  const user = await seedSuperAdmin();
  const original = {
    classes: [{ id: "class-original" }],
    teachers: [{ id: "teacher-original" }],
    students: [{ id: "student-original" }],
  };
  setValue(CLASSES_KEY, original.classes);
  setValue(TEACHERS_KEY, original.teachers);
  setValue(STUDENTS_KEY, original.students);

  const result = await adminService.restoreBackup(
    user,
    await encryptedFixture(backupFixture({ users: [{ passwordHash: "[PROTECTED]", salt: "[PROTECTED]" }], students: "invalid" })),
    BACKUP_PASSWORD
  );

  assert.equal(result.success, false);
  assert.deepEqual(getValue(CLASSES_KEY), original.classes);
  assert.deepEqual(getValue(TEACHERS_KEY), original.teachers);
  assert.deepEqual(getValue(STUDENTS_KEY), original.students);
});

test("ordinary backup includes school data but no account credentials", async () => {
  const user = await seedSuperAdmin();
  setValue("thcs_quang_chau_content_posts", [{ id: "post-1" }]);
  setValue(STUDENTS_KEY, [{ id: "student-1", studentCode: "S-1", fullName: "Student", classId: "class-1" }]);
  setValue(CLASSES_KEY, [{ id: "class-1", gradeId: "grade-1", name: "6A", accessCode: "PRIVATE-CLASS-CODE" }]);
  setValue(TEACHERS_KEY, [{ id: "teacher-1", fullName: "Private Teacher", email: "private@example.test" }]);
  const encrypted = await adminService.exportBackup(user, BACKUP_PASSWORD);
  const backup = await decryptBackupPayload(encrypted, BACKUP_PASSWORD) as Record<string, unknown>;

  assert.equal(encrypted.includes("Student"), false);
  assert.equal(encrypted.includes("PRIVATE-CLASS-CODE"), false);
  assert.equal(encrypted.includes("private@example.test"), false);
  assert.equal(backup.schemaVersion, 2);
  assert.equal("users" in backup, false);
  assert.equal(JSON.stringify(backup).includes(user.passwordHash), false);
  assert.equal(JSON.stringify(backup).includes(user.salt), false);
  assert.deepEqual((backup.content as { posts: unknown[] }).posts, [{ id: "post-1" }]);
  assert.deepEqual(backup.students, [{ id: "student-1", studentCode: "S-1", fullName: "Student", classId: "class-1" }]);
  assert.deepEqual(backup.classes, [{ id: "class-1", gradeId: "grade-1", name: "6A", accessCode: "PRIVATE-CLASS-CODE" }]);
  assert.deepEqual(backup.teachers, [{ id: "teacher-1", fullName: "Private Teacher", email: "private@example.test" }]);
  assert.match(String(backup.notice), /không được sao lưu/i);
});

test("a backup saved in the archive can be read after reload and restored", async () => {
  const user = await seedSuperAdmin();
  const content = await encryptedFixture(backupFixture({
    school: {
      id: "school-backup",
      name: "Archived Fixture School",
      code: "FIXTURE",
      province: "Fixture",
      district: "Fixture",
      academicYear: "2026-2027",
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
      status: "active",
    },
  }));
  const records = new Map<string, BackupArchiveRecord>();
  const makeArchive = (): BackupArchive => ({
    async get(id) { return records.get(id); },
    async getAll() { return [...records.values()]; },
    async add(record) {
      if (records.has(record.id)) throw new Error("duplicate ID");
      records.set(record.id, record);
    },
  });
  const saved = await saveBackupToArchive(content, BACKUP_SCHEMA_VERSION, makeArchive(), "restore-fixture");

  const reloadedArchive = makeArchive();
  const restoredRecord = await reloadedArchive.get(saved.id);
  assert.ok(restoredRecord);
  await verifyArchivedBackup(restoredRecord);
  const result = await adminService.restoreBackup(user, restoredRecord.content, BACKUP_PASSWORD);

  assert.equal(result.success, true);
  assert.equal(adminService.getSchool().name, "Archived Fixture School");
});

test("password recovery refuses without proof of target ownership and changes nothing", async () => {
  const admin = await seedSuperAdmin();
  const target: StoredUserAccount = {
    ...admin,
    id: "old-account",
    email: "old@example.test",
    fullName: "Old Account",
    role: "teacher",
    permissions: [],
    createdBy: "original-owner",
  };
  const users = [admin, target];
  setValue(USERS_KEY, users);

  const mismatch = await adminService.recoverAccountPassword(
    admin,
    target.id,
    superAdminPassword,
    "NewPassword123",
    "DifferentPassword123"
  );
  assert.equal(mismatch.success, false);
  assert.deepEqual(getValue(USERS_KEY), users);

  const incorrectCurrentPassword = await adminService.recoverAccountPassword(
    admin,
    target.id,
    "WrongCurrentPassword",
    "NewPassword123",
    "NewPassword123"
  );
  assert.equal(incorrectCurrentPassword.success, false);

  const recovered = await adminService.recoverAccountPassword(
    admin,
    target.id,
    superAdminPassword,
    "NewPassword123",
    "NewPassword123"
  );
  assert.equal(recovered.success, false);
  assert.match(recovered.message, /quyền sở hữu tài khoản đích/i);
  const updatedUsers = getValue<StoredUserAccount[]>(USERS_KEY)!;
  const updatedTarget = updatedUsers.find((item) => item.id === target.id)!;
  assert.deepEqual(updatedTarget, target);
  assert.deepEqual(updatedUsers[0], admin);
  assert.equal(values.has(LOGS_KEY), false);

  values.delete(SESSION_KEY);
  await assert.rejects(
    adminService.recoverAccountPassword(admin, target.id, superAdminPassword, "NewPassword123", "NewPassword123"),
    /chỉ dành riêng cho Admin chính/i
  );
  assert.deepEqual(getValue(USERS_KEY), users);
});

test("restore rejects legacy backups without a schema version without writing", async () => {
  const user = await seedSuperAdmin();
  const oldSchool = { id: "original-school" };
  setValue(SCHOOL_KEY, oldSchool);
  const legacyBackup = backupFixture();
  delete legacyBackup.schemaVersion;

  const result = await adminService.restoreBackup(
    user,
    await encryptedFixture(legacyBackup),
    BACKUP_PASSWORD
  );

  assert.equal(result.success, false);
  assert.match(result.message, /schemaVersion/i);
  assert.deepEqual(getValue(SCHOOL_KEY), oldSchool);
  assert.equal(values.has(CLASSES_KEY), false);
});

test("restore rejects a modified encrypted file without changing fixture data", async () => {
  const user = await seedSuperAdmin();
  const originalSchool = { id: "untouched-school" };
  setValue(SCHOOL_KEY, originalSchool);
  const encrypted = await encryptedFixture();
  const envelope = JSON.parse(encrypted) as { ciphertext: string };
  envelope.ciphertext = `${envelope.ciphertext.slice(0, -4)}AAAA`;

  const result = await adminService.restoreBackup(
    user,
    JSON.stringify(envelope),
    BACKUP_PASSWORD
  );

  assert.equal(result.success, false);
  assert.match(result.message, /checksum/i);
  assert.deepEqual(getValue(SCHOOL_KEY), originalSchool);
  assert.equal(values.has(CLASSES_KEY), false);
});

test("restore refuses a fixture write while another tab owns the Web Lock", async () => {
  const user = await seedSuperAdmin();
  const originalSchool = { id: "untouched-school" };
  setValue(SCHOOL_KEY, originalSchool);
  writeLockUnavailable = true;

  const result = await adminService.restoreBackup(
    user,
    await encryptedFixture(),
    BACKUP_PASSWORD
  );

  assert.equal(result.success, false);
  assert.match(result.message, /tab khác đang ghi/i);
  assert.deepEqual(getValue(SCHOOL_KEY), originalSchool);
  assert.equal(values.has(CLASSES_KEY), false);
});

test("ordinary school writes fail closed when another tab owns the shared Web Lock", async () => {
  const user = await seedSuperAdmin();
  const originalSchool = getValue<Record<string, unknown>>(SCHOOL_KEY);
  writeLockUnavailable = true;

  await assert.rejects(
    adminService.updateSchool({ academicYear: "2099-2100" }, user),
    /tab khác đang ghi/i
  );
  assert.deepEqual(getValue(SCHOOL_KEY), originalSchool);
});

test("restore reports a write failure and rolls back earlier writes", async () => {
  const user = await seedSuperAdmin();
  const oldSchool = { id: "old-school" };
  const oldGrades = [{ id: "old-grade" }];
  setValue(SCHOOL_KEY, oldSchool);
  setValue(GRADES_KEY, oldGrades);
  setValue(CLASSES_KEY, [{ id: "old-class" }]);
  failKey = CLASSES_KEY;
  failCount = 1;

  const result = await adminService.restoreBackup(
    user,
    await encryptedFixture(),
    BACKUP_PASSWORD
  );

  assert.equal(result.success, false);
  assert.match(result.message, /Simulated storage write failure/);
  assert.deepEqual(getValue(SCHOOL_KEY), oldSchool);
  assert.deepEqual(getValue(GRADES_KEY), oldGrades);
  assert.deepEqual(getValue(CLASSES_KEY), [{ id: "old-class" }]);
});

test("failed session deletion throws and leaves the session active", async () => {
  const user = await seedSuperAdmin();
  failKey = SESSION_KEY;
  failOperation = "remove";

  await assert.rejects(adminService.logout(), /phiên đăng nhập: thao tác lưu trữ thất bại/);
  assert.notEqual(getValue(SESSION_KEY), null);
  assert.equal(values.has(LOGS_KEY), false);
  assert.equal(adminService.getCurrentSessionUser()?.id, user.id);
});

test("competition creation, editing, closing, archiving, and result lock", async () => {
  const actor = await seedSuperAdmin();
  const created = await competitionService.createCompetition(actor, competitionInput());
  assert.equal(created.status, "preparing");
  assert.equal(competitionService.getData(actor).competitions.length, 1);

  const updated = await competitionService.updateCompetition(actor, created.id, competitionInput({ description: "Đã cập nhật" }));
  assert.equal(updated.description, "Đã cập nhật");
  assert.equal((await competitionService.closeCompetition(actor, created.id)).status, "ended");
  assert.equal((await competitionService.archiveCompetition(actor, created.id, true)).status, "archived");
  await assert.rejects(
    competitionService.updateCompetition(actor, created.id, competitionInput()),
    /đã lưu trữ/i
  );
  await assert.rejects(
    competitionService.archiveCompetition(actor, created.id, false),
    /cần xác nhận/i
  );
});

test("contestant import preview rejects duplicate rows without writing", async () => {
  const actor = await seedSuperAdmin();
  const competition = await competitionService.createCompetition(actor, competitionInput());
  const importRows: ContestantImportRow[] = [
    { fullName: "Nguyễn An", className: "6A1" },
    { fullName: "Nguyễn An", className: "6A1" },
    { fullName: "", className: "6A1" },
  ];
  const preview = competitionService.previewContestantImport(actor, competition.id, importRows);
  assert.equal(preview.validCount, 1);
  assert.equal(preview.invalidCount, 2);
  await assert.rejects(competitionService.importContestants(actor, competition.id, importRows), /chưa nhập dòng nào/i);
  assert.equal(competitionService.getData(actor).contestants.length, 0);
});

test("linking an existing student does not modify the source student record", async () => {
  const actor = await seedSuperAdmin();
  const student = {
    id: "existing-student",
    schoolId: "test-school",
    studentCode: "ST-001",
    fullName: "Học sinh giả",
    gender: "nam",
    birthDate: "2013-01-01",
    gradeLevel: 7,
    classId: "class-test",
    className: "7A1",
    academicYear: "2026-2027",
    status: "studying",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdBy: "test",
  };
  setValue(STUDENTS_KEY, [student]);
  const originalStudents = getValue(STUDENTS_KEY);
  const competition = await competitionService.createCompetition(actor, competitionInput());
  const contestant = await competitionService.addLinkedStudent(actor, competition.id, student.id);

  assert.equal(contestant.sourceStudentId, student.id);
  assert.equal(contestant.fullName, student.fullName);
  assert.deepEqual(getValue(STUDENTS_KEY), originalStudents);
  assert.equal(competitionService.getData(actor).contestants.length, 1);
});

test("single-submission competitions enforce one entry per contestant", async () => {
  const actor = await seedSuperAdmin();
  const competition = await competitionService.createCompetition(actor, competitionInput());
  const contestant = await competitionService.addContestant(actor, competition.id, { fullName: "Thí sinh" });
  await assert.rejects(competitionService.addSubmission(actor, competition.id, contestant.id), /chỉ cho phép một bài dự thi/i);
});

test("criteria scoring ranks equal scores together and exports rows to Excel", async () => {
  const actor = await seedSuperAdmin();
  const competition = await competitionService.createCompetition(actor, competitionInput({
    scoringMode: "criteria",
    criteria: [{ id: "creativity", name: "Sáng tạo", maxPoints: 10 }],
  }));
  const contestantA = await competitionService.addContestant(actor, competition.id, { fullName: "Thí sinh A" });
  const contestantB = await competitionService.addContestant(actor, competition.id, { fullName: "Thí sinh B" });
  const contestantC = await competitionService.addContestant(actor, competition.id, { fullName: "Thí sinh C" });
  const currentSubmissions = competitionService.getData(actor).submissions;
  for (const [contestant, score] of [[contestantA, 8], [contestantB, 8], [contestantC, 6]] as const) {
    const submission = currentSubmissions.find((item) => item.contestantId === contestant.id)!;
    await competitionService.saveSubmission(actor, competition.id, contestant.id, {
      status: "valid",
      productDescription: "Sản phẩm",
      productUrl: "",
      criteriaScores: { creativity: score },
      feedback: "",
    }, submission.id);
  }
  const rankings = competitionService.getRankings(actor, competition.id);
  assert.deepEqual(rankings.map((item) => item.rank), [1, 1, 3]);
  const rows = competitionService.getExportRows(actor, competition.id);
  assert.equal(rows.length, 3);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "KetQua");
  const exported = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  assert.ok(exported.length > 0);
});

test("multiple-submission competitions allow extra entries and archives prevent edits", async () => {
  const actor = await seedSuperAdmin();
  const competition = await competitionService.createCompetition(actor, competitionInput({
    allowMultipleSubmissions: true,
  }));
  const contestant = await competitionService.addContestant(actor, competition.id, { fullName: "Thí sinh" });
  const extra = await competitionService.addSubmission(actor, competition.id, contestant.id);
  await competitionService.saveSubmission(actor, competition.id, contestant.id, {
    status: "submitted", productDescription: "Bài thứ hai", productUrl: "", criteriaScores: {}, feedback: "",
  }, extra.id);
  assert.equal(competitionService.getData(actor).submissions.filter((item) => item.contestantId === contestant.id).length, 2);
  await competitionService.archiveCompetition(actor, competition.id, true);
  await assert.rejects(competitionService.saveSubmission(actor, competition.id, contestant.id, {
    status: "valid",
    productDescription: "Sửa sau lưu trữ",
    productUrl: "",
    criteriaScores: {},
    feedback: "",
  }, extra.id), /đã lưu trữ/i);
});

test("old backups preserve competitions; new backups include and restore them", async () => {
  const actor = await seedSuperAdmin();
  const competition = await competitionService.createCompetition(actor, competitionInput());
  const newBackup = await decryptBackupPayload(
    await adminService.exportBackup(actor, BACKUP_PASSWORD),
    BACKUP_PASSWORD
  ) as Record<string, unknown>;
  const backupCompetitions = (newBackup.competitions as { competitions: Competition[] }).competitions;
  assert.ok(backupCompetitions.find((item) => item.id === competition.id));
  setValue(COMPETITION_STORAGE_KEY, { schemaVersion: 1, competitions: [], contestants: [], submissions: [] });
  const newRestore = await adminService.restoreBackup(
    actor,
    await encryptedFixture(newBackup),
    BACKUP_PASSWORD
  );
  assert.equal(newRestore.success, true);
  assert.ok(competitionService.getData(actor).competitions.find((item) => item.id === competition.id));

  const oldBackup = backupFixture();
  assert.equal(Object.prototype.hasOwnProperty.call(oldBackup, "competitions"), false);
  const oldRestore = await adminService.restoreBackup(
    actor,
    await encryptedFixture(oldBackup),
    BACKUP_PASSWORD
  );
  assert.equal(oldRestore.success, true);
  assert.ok(competitionService.getData(actor).competitions.find((item) => item.id === competition.id));
});

test("invalid competition backup is rejected before changing school or roster data", async () => {
  const actor = await seedSuperAdmin();
  const originalSchool = { id: "untouched-school" };
  const originalStudents = [{ id: "untouched-student" }];
  const originalTeachers = [{ id: "untouched-teacher" }];
  const originalClasses = [{ id: "untouched-class" }];
  setValue(SCHOOL_KEY, originalSchool);
  setValue(STUDENTS_KEY, originalStudents);
  setValue(TEACHERS_KEY, originalTeachers);
  setValue(CLASSES_KEY, originalClasses);
  const invalidBackup = backupFixture({
    competitions: { schemaVersion: 1, competitions: [{ id: "bad" }], contestants: [], submissions: [] },
  });

  const result = await adminService.restoreBackup(
    actor,
    await encryptedFixture(invalidBackup),
    BACKUP_PASSWORD
  );

  assert.equal(result.success, false);
  assert.deepEqual(getValue(SCHOOL_KEY), originalSchool);
  assert.deepEqual(getValue(STUDENTS_KEY), originalStudents);
  assert.deepEqual(getValue(TEACHERS_KEY), originalTeachers);
  assert.deepEqual(getValue(CLASSES_KEY), originalClasses);
});

test("competition storage failure preserves previous data and unauthenticated actors are denied", async () => {
  const actor = await seedSuperAdmin();
  const original = { schemaVersion: 1, competitions: [], contestants: [], submissions: [] };
  setValue(COMPETITION_STORAGE_KEY, original);
  failKey = COMPETITION_STORAGE_KEY;
  failCount = 1;
  await assert.rejects(competitionService.createCompetition(actor, competitionInput()), /không thể ghi dữ liệu cuộc thi/i);
  assert.deepEqual(getValue(COMPETITION_STORAGE_KEY), original);

  values.delete(SESSION_KEY);
  await assert.rejects(competitionService.createCompetition(actor, competitionInput()), /chỉ Super Admin/i);
});

test("competition writes roll back snapshots after pre-write, partial-write, and verification failures", async () => {
  const actor = await seedSuperAdmin();
  const original = {
    schemaVersion: 1,
    competitions: [],
    contestants: [],
    submissions: [],
  };
  setValue(COMPETITION_STORAGE_KEY, original);

  failKey = COMPETITION_STORAGE_KEY;
  failCount = 1;
  await assert.rejects(
    competitionService.createCompetition(actor, competitionInput()),
    /snapshot cũ đã được khôi phục và xác minh/i
  );
  assert.deepEqual(getValue(COMPETITION_STORAGE_KEY), original);

  failCount = 0;
  failAfterSetCount = 1;
  await assert.rejects(
    competitionService.createCompetition(actor, competitionInput()),
    /snapshot cũ đã được khôi phục và xác minh/i
  );
  assert.deepEqual(getValue(COMPETITION_STORAGE_KEY), original);

  failAfterSetCount = 0;
  failReadAfterSetCount = 1;
  await assert.rejects(
    competitionService.createCompetition(actor, competitionInput()),
    /snapshot cũ đã được khôi phục và xác minh/i
  );
  assert.deepEqual(getValue(COMPETITION_STORAGE_KEY), original);

  failReadAfterSetCount = 0;
  mismatchReadAfterSetCount = 1;
  await assert.rejects(
    competitionService.createCompetition(actor, competitionInput()),
    /snapshot cũ đã được khôi phục và xác minh/i
  );
  assert.deepEqual(getValue(COMPETITION_STORAGE_KEY), original);
});

test("competition write reports an unverifiable state when both write and rollback fail", async () => {
  const actor = await seedSuperAdmin();
  const original = { schemaVersion: 1, competitions: [], contestants: [], submissions: [] };
  setValue(COMPETITION_STORAGE_KEY, original);
  failKey = COMPETITION_STORAGE_KEY;
  failAfterSetCount = 1;
  rollbackSetFailureCount = 1;

  await assert.rejects(
    competitionService.createCompetition(actor, competitionInput()),
    /rollback snapshot thất bại hoặc không xác minh được/i
  );
  assert.notDeepEqual(getValue(COMPETITION_STORAGE_KEY), original);
});

test("restore rolls back the competition key after a post-write failure and preserves all raw storage", async () => {
  const actor = await seedSuperAdmin();
  const originalCompetition = await competitionService.createCompetition(actor, competitionInput({
    name: "Original competition",
  }));
  const originalCompetitionRaw = values.get(COMPETITION_STORAGE_KEY);
  assert.notEqual(originalCompetitionRaw, undefined);
  await competitionService.createCompetition(actor, competitionInput({ name: "Backup competition" }));
  const newBackup = await decryptBackupPayload(
    await adminService.exportBackup(actor, BACKUP_PASSWORD),
    BACKUP_PASSWORD
  ) as Record<string, unknown>;
  const backupCompetitions = (newBackup.competitions as { competitions: Competition[] }).competitions;
  assert.ok(backupCompetitions.some((item) => item.id !== originalCompetition.id));
  values.set(COMPETITION_STORAGE_KEY, originalCompetitionRaw as string);
  const rawSnapshot = new Map(values);

  failKey = COMPETITION_STORAGE_KEY;
  failAfterSetCount = 1;

  const result = await adminService.restoreBackup(
    actor,
    await encryptedFixture(newBackup),
    BACKUP_PASSWORD
  );

  assert.equal(result.success, false);
  assert.equal(writeFailureTriggered, true);
  assert.notEqual(valueAtAfterSetFailure, originalCompetitionRaw);
  assert.equal(values.get(COMPETITION_STORAGE_KEY), originalCompetitionRaw);
  const valuesWithoutRecoveryJournal = new Map(values);
  const recoveryJournal = valuesWithoutRecoveryJournal.get(
    "thcs_quang_chau_admin_academic_year_sync_journal_v1"
  );
  valuesWithoutRecoveryJournal.delete("thcs_quang_chau_admin_academic_year_sync_journal_v1");
  assert.deepEqual(valuesWithoutRecoveryJournal, rawSnapshot);
  assert.match(recoveryJournal ?? "", /"status":"rolled_back"/);
});

test("real XLSX workbook is read with FileReader and validated before import", async () => {
  const actor = await seedSuperAdmin();
  const competition = await competitionService.createCompetition(actor, competitionInput());
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Họ và tên", "Lớp", "Mã học sinh"],
    ["Thí sinh A", "6A1", "HS-001"],
    ["", "", ""],
    ["Thí sinh A", "6A1", "HS-001"],
    ["", "6A2", "HS-002"],
    ["Thí sinh B", "6A2", "HS/003"],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "ThiSinh");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const file = new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const originalFileReader = globalThis.FileReader;
  class TestFileReader {
    result: string | ArrayBuffer | null = null;
    onload: ((this: FileReader, event: ProgressEvent<FileReader>) => unknown) | null = null;
    onerror: ((this: FileReader, event: ProgressEvent<FileReader>) => unknown) | null = null;
    readAsArrayBuffer(blob: Blob): void {
      void blob.arrayBuffer().then((result) => {
        this.result = result;
        this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
      }).catch(() => this.onerror?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>));
    }
  }
  Object.defineProperty(globalThis, "FileReader", { configurable: true, value: TestFileReader as unknown as typeof FileReader });
  try {
    const rows = await readContestantExcel(file);
    assert.equal(rows.length, 4, "blank worksheet rows should be ignored");
    const preview = competitionService.previewContestantImport(actor, competition.id, rows);
    assert.equal(preview.validCount, 1);
    assert.equal(preview.invalidCount, 3);
    assert.match(preview.rows[2].error ?? "", /thiếu họ tên/i);
    assert.match(preview.rows[3].error ?? "", /sai định dạng/i);
    await assert.rejects(competitionService.importContestants(actor, competition.id, rows), /chưa nhập dòng nào/i);
    assert.equal(competitionService.getData(actor).contestants.length, 0);

    const missingHeaderSheet = XLSX.utils.aoa_to_sheet([["Tên", "Lớp"], ["A", "6A1"]]);
    const invalidWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(invalidWorkbook, missingHeaderSheet, "SaiHeader");
    const invalidBytes = XLSX.write(invalidWorkbook, { type: "array", bookType: "xlsx" });
    await assert.rejects(
      readContestantExcel(new Blob([new Uint8Array(invalidBytes)])),
      /thiếu cột bắt buộc/i
    );
    assert.equal(values.has(COMPETITION_STORAGE_KEY), true);
    assert.equal(values.has("competition_excel_original_file"), false);
  } finally {
    Object.defineProperty(globalThis, "FileReader", { configurable: true, value: originalFileReader });
  }
});

test("activity-log reads remain permission gated for an authenticated viewer", async () => {
  const admin = await seedSuperAdmin();
  const logs = makeActivityLogs(2);
  setValue(LOGS_KEY, logs);

  assert.deepEqual(adminService.getActivityLogs(admin), logs);
});

test("student login and logout log only against the authenticated student session", async () => {
  const student = makeTestStudent();
  const schoolClass = makeTestClass();
  setValue(CLASSES_KEY, [schoolClass]);
  setValue(STUDENTS_KEY, [student]);

  const login = await studentService.login(
    student.fullName,
    student.gradeLevel,
    schoolClass.id,
    schoolClass.accessCode ?? ""
  );
  assert.equal(login.success, true);
  assert.equal(getValue<ActivityLog[]>(LOGS_KEY)?.length, 1);
  assert.equal(values.has(STUDENT_SESSION_KEY), true);

  await studentService.logout();
  assert.equal(getValue<ActivityLog[]>(LOGS_KEY)?.length, 2);
  assert.equal(values.has(STUDENT_SESSION_KEY), false);
});

test("a failed student login does not append an unauthenticated guest log", async () => {
  const schoolClass = makeTestClass();
  const original = makeActivityLogs(2);
  setValue(CLASSES_KEY, [schoolClass]);
  setValue(STUDENTS_KEY, []);
  setValue(LOGS_KEY, original);
  const rawBefore = values.get(LOGS_KEY);

  const login = await studentService.login(
    "Unknown Student",
    schoolClass.gradeLevel,
    schoolClass.id,
    schoolClass.accessCode ?? ""
  );

  assert.equal(login.success, false);
  assert.equal(values.get(LOGS_KEY), rawBefore);
  assert.equal(values.has(STUDENT_SESSION_KEY), false);
});

test("an authenticated admin without view_reports cannot read logs but can append as themself", async () => {
  const admin = seedLogActor("admin");
  const original = makeActivityLogs(2);
  setValue(LOGS_KEY, original);

  assert.deepEqual(adminService.getActivityLogs(admin), []);
  assert.equal(
    await adminService.logExternalActivity(admin.id, admin.fullName, admin.role, "TEST_ACTION", "system", "test"),
    true
  );
  const updated = getValue<ActivityLog[]>(LOGS_KEY);
  assert.equal(updated?.length, 3);
  assert.deepEqual(updated?.slice(1), original);
});

test("a valid student session can append without an admin viewing permission", async () => {
  const student = makeTestStudent();
  const now = Date.now();
  const session: StudentSession = {
    studentId: student.id,
    studentCode: student.studentCode,
    fullName: student.fullName,
    gradeLevel: student.gradeLevel,
    classId: student.classId,
    className: student.className,
    role: "student",
    token: createStudentToken(student.id, student.classId, now + 60_000),
    createdAt: now,
    expiresAt: now + 60_000,
  };
  setValue(STUDENTS_KEY, [student]);
  setValue(STUDENT_SESSION_KEY, session);
  const original = makeActivityLogs(1);
  setValue(LOGS_KEY, original);
  const rawBefore = values.get(LOGS_KEY);

  assert.deepEqual(adminService.getActivityLogs(), []);
  assert.equal(
    await adminService.logExternalActivity("different-student", student.fullName, "student", "TEST_ACTION", "student", "test"),
    false
  );
  assert.equal(values.get(LOGS_KEY), rawBefore);
  assert.equal(
    await adminService.logExternalActivity(student.id, student.fullName, "student", "TEST_ACTION", "student", "test"),
    true
  );
  assert.deepEqual(getValue<ActivityLog[]>(LOGS_KEY)?.slice(1), original);
});

test("an unauthenticated or mismatched actor is rejected without changing logs", async () => {
  const original = makeActivityLogs(2);
  setValue(LOGS_KEY, original);
  const rawBefore = values.get(LOGS_KEY);

  assert.equal(
    await adminService.logExternalActivity("guest", "Guest", "student", "TEST_ACTION", "student", "test"),
    false
  );
  assert.equal(values.get(LOGS_KEY), rawBefore);

  const admin = seedLogActor("admin");
  assert.equal(
    await adminService.logExternalActivity("different-id", admin.fullName, "admin", "TEST_ACTION", "system", "test"),
    false
  );
  assert.equal(
    await adminService.logExternalActivity(admin.id, admin.fullName, "teacher", "TEST_ACTION", "system", "test"),
    false
  );
  assert.equal(values.get(LOGS_KEY), rawBefore);
});

test("a genuinely missing log key initializes an empty history before append", async () => {
  const admin = seedLogActor("admin");

  assert.equal(values.has(LOGS_KEY), false);
  assert.equal(
    await adminService.logExternalActivity(admin.id, admin.fullName, "admin", "TEST_ACTION", "system", "test"),
    true
  );
  assert.equal(getValue<ActivityLog[]>(LOGS_KEY)?.length, 1);
});

test("malformed JSON or an invalid log shape refuses append and preserves the original value", async () => {
  const admin = seedLogActor("admin");
  const malformedRaw = "{invalid-json";
  values.set(LOGS_KEY, malformedRaw);

  await assert.rejects(
    adminService.logExternalActivity(admin.id, admin.fullName, "admin", "TEST_ACTION", "system", "test"),
    /JSON bị lỗi/i
  );
  assert.equal(values.get(LOGS_KEY), malformedRaw);

  const invalidShape = JSON.stringify([{ id: "incomplete" }]);
  values.set(LOGS_KEY, invalidShape);
  await assert.rejects(
    adminService.logExternalActivity(admin.id, admin.fullName, "admin", "TEST_ACTION", "system", "test"),
    /cấu trúc dữ liệu không hợp lệ/i
  );
  assert.equal(values.get(LOGS_KEY), invalidShape);
});

test("a LocalStorage read failure refuses append and preserves the existing raw value", async () => {
  const admin = seedLogActor("admin");
  const original = makeActivityLogs(2);
  setValue(LOGS_KEY, original);
  const rawBefore = values.get(LOGS_KEY);
  failKey = LOGS_KEY;
  failReadCount = 1;

  await assert.rejects(
    adminService.logExternalActivity(admin.id, admin.fullName, "admin", "TEST_ACTION", "system", "test"),
    /Không thể đọc nhật ký hoạt động/i
  );
  assert.equal(values.get(LOGS_KEY), rawBefore);
});

test("an authentication storage read failure refuses append without changing logs", async () => {
  const admin = seedLogActor("admin");
  const original = makeActivityLogs(2);
  setValue(LOGS_KEY, original);
  const rawBefore = values.get(LOGS_KEY);
  failKey = SESSION_KEY;
  failReadCount = 1;

  await assert.rejects(
    adminService.logExternalActivity(admin.id, admin.fullName, "admin", "TEST_ACTION", "system", "test"),
    /Không thể xác minh tác nhân nhật ký/i
  );
  assert.equal(values.get(LOGS_KEY), rawBefore);
});

test("a LocalStorage write failure is reported and the existing history is restored", async () => {
  const admin = seedLogActor("admin");
  const original = makeActivityLogs(2);
  setValue(LOGS_KEY, original);
  const rawBefore = values.get(LOGS_KEY);
  failKey = LOGS_KEY;
  failOperation = "set";
  failCount = 1;

  await assert.rejects(
    adminService.logExternalActivity(admin.id, admin.fullName, "admin", "TEST_ACTION", "system", "test"),
    /Không thể hoàn tất|thao tác lưu trữ thất bại/i
  );
  assert.equal(values.get(LOGS_KEY), rawBefore);
});

test("a write that mutates and then fails rolls the activity history back", async () => {
  const admin = seedLogActor("admin");
  const original = makeActivityLogs(2);
  setValue(LOGS_KEY, original);
  const rawBefore = values.get(LOGS_KEY);
  failKey = LOGS_KEY;
  failAfterSetCount = 1;

  await assert.rejects(
    adminService.logExternalActivity(admin.id, admin.fullName, "admin", "TEST_ACTION", "system", "test"),
    /Không thể hoàn tất|Simulated write failure after mutation/i
  );
  assert.equal(values.get(LOGS_KEY), rawBefore);
});

test("an append preserves the newest 500 activity records", async () => {
  const admin = seedLogActor("admin");
  const original = makeActivityLogs(500);
  setValue(LOGS_KEY, original);

  assert.equal(
    await adminService.logExternalActivity(admin.id, admin.fullName, "admin", "TEST_ACTION", "system", "test"),
    true
  );
  const updated = getValue<ActivityLog[]>(LOGS_KEY);
  assert.equal(updated?.length, 500);
  assert.equal(updated?.[0].action, "TEST_ACTION");
  assert.deepEqual(updated?.slice(1), original.slice(0, 499));
});

test("grade lookups and class creation are scoped by school and academic year", async () => {
  const admin = await seedSuperAdmin();
  setValue(SCHOOL_KEY, {
    id: "test-school",
    academicYear: "2026-2027",
    name: "Test School",
    code: "TEST",
    province: "Test",
    district: "Test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status: "active",
  });
  setValue(GRADES_KEY, [
    { id: "grade-6", schoolId: "test-school", level: 6, academicYear: "2025-2026" },
    { id: "grade-6", schoolId: "test-school", level: 6, academicYear: "2026-2027" },
    { id: "grade-6", schoolId: "other-school", level: 6, academicYear: "2026-2027" },
  ]);
  setValue(CLASSES_KEY, []);
  setValue(STUDENTS_KEY, []);

  assert.deepEqual(
    adminService.getGrades("test-school", "2026-2027").map((grade) => grade.academicYear),
    ["2026-2027"]
  );
  const created = await adminService.createClass(admin, { name: "6B1", gradeLevel: 6 });

  assert.equal(created.success, true);
  assert.equal(created.schoolClass?.gradeId, "grade-6");
  assert.equal(created.schoolClass?.academicYear, "2026-2027");
  assert.equal(created.schoolClass?.homeroomTeacherId, undefined);
  assert.equal(
    getValue<ActivityLog[]>(LOGS_KEY)?.some((log) => log.details.includes(created.schoolClass!.accessCode ?? "")),
    false
  );
});

test("class creation rejects a grade missing from the requested school-year scope", async () => {
  const admin = await seedSuperAdmin();
  setValue(SCHOOL_KEY, {
    id: "test-school",
    academicYear: "2026-2027",
    name: "Test School",
    code: "TEST",
    province: "Test",
    district: "Test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status: "active",
  });
  setValue(GRADES_KEY, [
    { id: "grade-6", schoolId: "test-school", level: 6, academicYear: "2025-2026" },
  ]);
  setValue(CLASSES_KEY, []);
  const rawClasses = values.get(CLASSES_KEY);

  const result = await adminService.createClass(admin, { name: "6B1", gradeLevel: 6 });

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /khối học tương ứng/i);
  assert.equal(values.get(CLASSES_KEY), rawClasses);
});

test("class creation and updates reject assigning a duplicate access code", async () => {
  const admin = await seedSuperAdmin();
  setValue(SCHOOL_KEY, {
    id: "test-school",
    academicYear: "2025-2026",
    name: "Test School",
    code: "TEST",
    province: "Test",
    district: "Test",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    status: "active",
  });
  setValue(GRADES_KEY, [
    { id: "test-grade", schoolId: "test-school", level: 6, academicYear: "2025-2026" },
  ]);
  const existingClass = makeTestClass();
  existingClass.accessCode = "SHARED";
  const secondClass = { ...existingClass, id: "second-class", name: "6B", accessCode: "UNIQUE" };
  setValue(CLASSES_KEY, [existingClass, secondClass]);
  setValue(STUDENTS_KEY, []);

  const createResult = await adminService.createClass(admin, {
    name: "6C",
    gradeLevel: 6,
    accessCode: " shared ",
  });
  const duplicateUpdate = await adminService.updateClass(admin, "second-class", { accessCode: "shared" });
  const updateResult = await adminService.updateClass(admin, existingClass.id, {
    accessCode: "OTHER",
  });
  setValue(CLASSES_KEY, [
    { ...existingClass, accessCode: "SHARED" },
    { ...secondClass, accessCode: "SHARED" },
  ]);
  setValue(STUDENTS_KEY, [makeTestStudent()]);
  const duplicateCodeLogin = await studentService.login(
    "Test Student",
    6,
    "second-class",
    "shared"
  );

  assert.equal(createResult.success, false);
  assert.match(createResult.error ?? "", /mã lớp đã được sử dụng/i);
  assert.equal(duplicateUpdate.success, false);
  assert.equal(updateResult.success, true);
  assert.equal(duplicateCodeLogin.success, false);
  assert.equal(values.has(STUDENT_SESSION_KEY), false);
  assert.equal(
    getValue<SchoolClass[]>(CLASSES_KEY)?.find((schoolClass) => schoolClass.id === "second-class")?.accessCode,
    "SHARED"
  );
});

test("class grade updates synchronize gradeId and linked student academic fields", async () => {
  const admin = await seedSuperAdmin();
  setValue(GRADES_KEY, [
    { id: "grade-6", schoolId: "test-school", level: 6, academicYear: "2025-2026" },
    { id: "grade-7", schoolId: "test-school", level: 7, academicYear: "2025-2026" },
    { id: "grade-7", schoolId: "test-school", level: 7, academicYear: "2026-2027" },
  ]);
  setValue(CLASSES_KEY, [makeTestClass()]);
  setValue(STUDENTS_KEY, [makeTestStudent()]);

  const result = await adminService.updateClass(admin, "test-class", {
    name: "7A",
    gradeLevel: 7,
    academicYear: "2026-2027",
  });

  assert.equal(result.success, true);
  assert.equal(getValue<SchoolClass[]>(CLASSES_KEY)?.[0].gradeId, "grade-7");
  assert.equal(getValue<Student[]>(STUDENTS_KEY)?.[0].gradeLevel, 7);
  assert.equal(getValue<Student[]>(STUDENTS_KEY)?.[0].className, "7A");
  assert.equal(getValue<SchoolClass[]>(CLASSES_KEY)?.[0].academicYear, "2026-2027");
  assert.equal(getValue<Student[]>(STUDENTS_KEY)?.[0].academicYear, "2026-2027");
});

test("student creation recalculates class size using only studying and locked statuses", async () => {
  const admin = await seedSuperAdmin();
  setValue(GRADES_KEY, [
    { id: "test-grade", schoolId: "test-school", level: 6, academicYear: "2025-2026" },
  ]);
  setValue(CLASSES_KEY, [{ ...makeTestClass(), studentCount: 90 }]);
  setValue(STUDENTS_KEY, [
    makeTestStudent(),
    { ...makeTestStudent(), id: "locked-student", studentCode: "LOCKED", status: "locked" },
    { ...makeTestStudent(), id: "transferred-student", studentCode: "TRANSFERRED", status: "transferred" },
    { ...makeTestStudent(), id: "graduated-student", studentCode: "GRADUATED", status: "graduated" },
  ]);

  const result = await adminService.createStudent(admin, {
    fullName: "New Student",
    studentCode: "NEW-001",
    gender: "nam",
    birthDate: "2012-01-01",
    classId: "test-class",
  });

  assert.equal(result.success, true);
  assert.equal(getValue<SchoolClass[]>(CLASSES_KEY)?.[0].studentCount, 3);
  assert.equal(result.student?.academicYear, "2025-2026");
  assert.equal(result.student?.gradeLevel, 6);
});

test("class aggregate statistics use the approved roster statuses", () => {
  setValue(CLASSES_KEY, [makeTestClass()]);
  setValue(STUDENTS_KEY, [
    makeTestStudent(),
    { ...makeTestStudent(), id: "locked-student", studentCode: "LOCKED", status: "locked" },
    { ...makeTestStudent(), id: "transferred-student", studentCode: "TRANSFERRED", status: "transferred" },
    { ...makeTestStudent(), id: "graduated-student", studentCode: "GRADUATED", status: "graduated" },
  ]);

  const stats = studentService.getClassAggregateStats("test-class");

  assert.equal(stats.totalStudentsInClass, 2);
  assert.equal(stats.participationRate, 0);
});

test("student status changes update counts and transfers synchronize class scope", async () => {
  const admin = await seedSuperAdmin();
  const sourceClass = makeTestClass();
  const targetClass: SchoolClass = {
    ...sourceClass,
    id: "target-class",
    gradeId: "grade-7",
    gradeLevel: 7,
    name: "7A",
    academicYear: "2026-2027",
    studentCount: 80,
  };
  setValue(GRADES_KEY, [
    { id: "test-grade", schoolId: "test-school", level: 6, academicYear: "2025-2026" },
    { id: "grade-7", schoolId: "test-school", level: 7, academicYear: "2026-2027" },
  ]);
  setValue(CLASSES_KEY, [{ ...sourceClass, studentCount: 20 }, targetClass]);
  setValue(STUDENTS_KEY, [
    makeTestStudent(),
    { ...makeTestStudent(), id: "locked-student", studentCode: "LOCKED", status: "locked" },
  ]);

  const changed = await adminService.updateStudent(admin, "locked-student", { status: "transferred" });
  assert.equal(changed.success, true);
  assert.equal(getValue<SchoolClass[]>(CLASSES_KEY)?.[0].studentCount, 1);

  const transferred = await adminService.transferStudent(admin, "test-student", "target-class");
  assert.equal(transferred.success, true);
  const storedStudent = getValue<Student[]>(STUDENTS_KEY)?.find((student) => student.id === "test-student");
  const storedClasses = getValue<SchoolClass[]>(CLASSES_KEY);
  assert.equal(storedStudent?.gradeLevel, 7);
  assert.equal(storedStudent?.academicYear, "2026-2027");
  assert.equal(storedStudent?.className, "7A");
  assert.equal(storedClasses?.find((schoolClass) => schoolClass.id === "test-class")?.studentCount, 0);
  assert.equal(storedClasses?.find((schoolClass) => schoolClass.id === "target-class")?.studentCount, 1);
});

test("student import validates class scope and recomputes counts from the roster", async () => {
  const admin = await seedSuperAdmin();
  const schoolClass = makeTestClass();
  setValue(GRADES_KEY, [
    { id: "test-grade", schoolId: "test-school", level: 6, academicYear: "2025-2026" },
  ]);
  setValue(CLASSES_KEY, [{ ...schoolClass, studentCount: 50 }]);
  setValue(STUDENTS_KEY, []);
  const row = {
    studentCode: "IMPORT-001",
    fullName: "Imported Student",
    gender: "nu" as const,
    birthDate: "2012-02-02",
    gradeLevel: 6 as const,
    classId: schoolClass.id,
    className: schoolClass.name,
  };

  const result = await adminService.bulkImportStudents(admin, [row]);

  assert.equal(result.success, true);
  assert.equal(getValue<SchoolClass[]>(CLASSES_KEY)?.[0].studentCount, 1);
  assert.equal(getValue<Student[]>(STUDENTS_KEY)?.[0].academicYear, schoolClass.academicYear);
  const classesBeforeInvalidImport = values.get(CLASSES_KEY);
  const invalid = await adminService.bulkImportStudents(admin, [{ ...row, studentCode: "IMPORT-002", gradeLevel: 7 }]);
  assert.equal(invalid.success, false);
  assert.equal(values.get(CLASSES_KEY), classesBeforeInvalidImport);
});

test("student and class writes roll back together when the second storage write fails", async () => {
  const admin = await seedSuperAdmin();
  setValue(GRADES_KEY, [
    { id: "test-grade", schoolId: "test-school", level: 6, academicYear: "2025-2026" },
  ]);
  setValue(CLASSES_KEY, [makeTestClass()]);
  setValue(STUDENTS_KEY, []);
  const classesBefore = values.get(CLASSES_KEY);
  const studentsBefore = values.get(STUDENTS_KEY);
  failKey = STUDENTS_KEY;
  failOperation = "set";
  failCount = 1;

  await assert.rejects(
    adminService.createStudent(admin, {
      fullName: "Test Student",
      studentCode: "ATOMIC-001",
      gender: "nam",
      birthDate: "2012-01-01",
      classId: "test-class",
    }),
    /không thể ghi học sinh|thao tác lưu trữ thất bại/i
  );
  assert.equal(values.get(CLASSES_KEY), classesBefore);
  assert.equal(values.get(STUDENTS_KEY), studentsBefore);
});

test("Local Storage authentication is blocked after Firebase Auth mode is enabled", async () => {
  adminService.enableFirebaseAuthMode();
  failKey = USERS_KEY;
  failReadCount = 1;

  const result = await adminService.authenticate("admin@example.test", "AnyPassword123");

  assert.equal(result.success, false);
  assert.equal(
    result.error,
    "Đăng nhập Local Storage đã bị vô hiệu hóa khi Firebase Auth được bật."
  );
  assert.equal(failReadCount, 1, "the legacy path must not read the Local Storage users key");
});
