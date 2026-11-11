import { test as nodeTest } from "node:test";
import * as assert from "node:assert/strict";
import { adminService } from "../src/services/adminService";
import { createTamperProofToken, hashPassword } from "../src/services/cryptoService";
import { StoredUserAccount, UserAccount } from "../src/types/adminTypes";
import * as XLSX from "xlsx";
import { competitionService, readContestantExcel } from "../src/services/competitionService";
import { COMPETITION_STORAGE_KEY, Competition, CompetitionScoringMode, ContestantImportRow } from "../src/types/competitionTypes";

const USERS_KEY = "thcs_quang_chau_admin_users";
const SESSION_KEY = "thcs_quang_chau_admin_session";
const SCHOOL_KEY = "thcs_quang_chau_admin_school";
const GRADES_KEY = "thcs_quang_chau_admin_grades";
const CLASSES_KEY = "thcs_quang_chau_admin_classes";
const TEACHERS_KEY = "thcs_quang_chau_admin_teachers";
const STUDENTS_KEY = "thcs_quang_chau_admin_students";
const LOGS_KEY = "thcs_quang_chau_admin_logs";

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
const superAdminPassword = "VerifiedAdminPassword123";
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
    value: { localStorage },
  });
}

function setValue(key: string, value: unknown): void {
  values.set(key, JSON.stringify(value));
}

function getValue<T>(key: string): T | null {
  const value = values.get(key);
  return value === undefined ? null : JSON.parse(value) as T;
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

function backupFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
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
  const result = adminService.restoreBackup(
    user,
    JSON.stringify(backupFixture({ users: [protectedUser] }))
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

  const result = adminService.restoreBackup(
    user,
    JSON.stringify(backupFixture({ users: [{ passwordHash: "[PROTECTED]", salt: "[PROTECTED]" }], students: "invalid" }))
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
  const backup = JSON.parse(await adminService.exportBackup(user)) as Record<string, unknown>;

  assert.equal(backup.schemaVersion, 1);
  assert.equal("users" in backup, false);
  assert.equal(JSON.stringify(backup).includes(user.passwordHash), false);
  assert.equal(JSON.stringify(backup).includes(user.salt), false);
  assert.deepEqual((backup.content as { posts: unknown[] }).posts, [{ id: "post-1" }]);
  assert.deepEqual(backup.students, [{ id: "student-1", studentCode: "S-1", fullName: "Student", classId: "class-1" }]);
  assert.match(String(backup.notice), /không được phục hồi/i);
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

  const result = adminService.restoreBackup(user, JSON.stringify(legacyBackup));

  assert.equal(result.success, false);
  assert.match(result.message, /schemaVersion/i);
  assert.deepEqual(getValue(SCHOOL_KEY), oldSchool);
  assert.equal(values.has(CLASSES_KEY), false);
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

  const result = adminService.restoreBackup(user, JSON.stringify(backupFixture()));

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

  assert.throws(() => adminService.logout(), /phiên đăng nhập: thao tác lưu trữ thất bại/);
  assert.notEqual(getValue(SESSION_KEY), null);
  assert.equal(values.has(LOGS_KEY), false);
  assert.equal(adminService.getCurrentSessionUser()?.id, user.id);
});

test("competition creation, editing, closing, archiving, and result lock", async () => {
  const actor = await seedSuperAdmin();
  const created = competitionService.createCompetition(actor, competitionInput());
  assert.equal(created.status, "preparing");
  assert.equal(competitionService.getData(actor).competitions.length, 1);

  const updated = competitionService.updateCompetition(actor, created.id, competitionInput({ description: "Đã cập nhật" }));
  assert.equal(updated.description, "Đã cập nhật");
  assert.equal(competitionService.closeCompetition(actor, created.id).status, "ended");
  assert.equal(competitionService.archiveCompetition(actor, created.id, true).status, "archived");
  assert.throws(
    () => competitionService.updateCompetition(actor, created.id, competitionInput()),
    /đã lưu trữ/i
  );
  assert.throws(
    () => competitionService.archiveCompetition(actor, created.id, false),
    /cần xác nhận/i
  );
});

test("contestant import preview rejects duplicate rows without writing", async () => {
  const actor = await seedSuperAdmin();
  const competition = competitionService.createCompetition(actor, competitionInput());
  const importRows: ContestantImportRow[] = [
    { fullName: "Nguyễn An", className: "6A1" },
    { fullName: "Nguyễn An", className: "6A1" },
    { fullName: "", className: "6A1" },
  ];
  const preview = competitionService.previewContestantImport(actor, competition.id, importRows);
  assert.equal(preview.validCount, 1);
  assert.equal(preview.invalidCount, 2);
  assert.throws(() => competitionService.importContestants(actor, competition.id, importRows), /chưa nhập dòng nào/i);
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
  const competition = competitionService.createCompetition(actor, competitionInput());
  const contestant = competitionService.addLinkedStudent(actor, competition.id, student.id);

  assert.equal(contestant.sourceStudentId, student.id);
  assert.equal(contestant.fullName, student.fullName);
  assert.deepEqual(getValue(STUDENTS_KEY), originalStudents);
  assert.equal(competitionService.getData(actor).contestants.length, 1);
});

test("single-submission competitions enforce one entry per contestant", async () => {
  const actor = await seedSuperAdmin();
  const competition = competitionService.createCompetition(actor, competitionInput());
  const contestant = competitionService.addContestant(actor, competition.id, { fullName: "Thí sinh" });
  assert.throws(() => competitionService.addSubmission(actor, competition.id, contestant.id), /chỉ cho phép một bài dự thi/i);
});

test("criteria scoring ranks equal scores together and exports rows to Excel", async () => {
  const actor = await seedSuperAdmin();
  const competition = competitionService.createCompetition(actor, competitionInput({
    scoringMode: "criteria",
    criteria: [{ id: "creativity", name: "Sáng tạo", maxPoints: 10 }],
  }));
  const contestantA = competitionService.addContestant(actor, competition.id, { fullName: "Thí sinh A" });
  const contestantB = competitionService.addContestant(actor, competition.id, { fullName: "Thí sinh B" });
  const contestantC = competitionService.addContestant(actor, competition.id, { fullName: "Thí sinh C" });
  const currentSubmissions = competitionService.getData(actor).submissions;
  for (const [contestant, score] of [[contestantA, 8], [contestantB, 8], [contestantC, 6]] as const) {
    const submission = currentSubmissions.find((item) => item.contestantId === contestant.id)!;
    competitionService.saveSubmission(actor, competition.id, contestant.id, {
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
  const competition = competitionService.createCompetition(actor, competitionInput({
    allowMultipleSubmissions: true,
  }));
  const contestant = competitionService.addContestant(actor, competition.id, { fullName: "Thí sinh" });
  const extra = competitionService.addSubmission(actor, competition.id, contestant.id);
  competitionService.saveSubmission(actor, competition.id, contestant.id, {
    status: "submitted", productDescription: "Bài thứ hai", productUrl: "", criteriaScores: {}, feedback: "",
  }, extra.id);
  assert.equal(competitionService.getData(actor).submissions.filter((item) => item.contestantId === contestant.id).length, 2);
  competitionService.archiveCompetition(actor, competition.id, true);
  assert.throws(() => competitionService.saveSubmission(actor, competition.id, contestant.id, {
    status: "valid",
    productDescription: "Sửa sau lưu trữ",
    productUrl: "",
    criteriaScores: {},
    feedback: "",
  }, extra.id), /đã lưu trữ/i);
});

test("old backups preserve competitions; new backups include and restore them", async () => {
  const actor = await seedSuperAdmin();
  const competition = competitionService.createCompetition(actor, competitionInput());
  const newBackup = JSON.parse(adminService.exportBackup(actor)) as Record<string, unknown>;
  const backupCompetitions = (newBackup.competitions as { competitions: Competition[] }).competitions;
  assert.ok(backupCompetitions.find((item) => item.id === competition.id));
  setValue(COMPETITION_STORAGE_KEY, { schemaVersion: 1, competitions: [], contestants: [], submissions: [] });
  const newRestore = adminService.restoreBackup(actor, JSON.stringify(newBackup));
  assert.equal(newRestore.success, true);
  assert.ok(competitionService.getData(actor).competitions.find((item) => item.id === competition.id));

  const oldBackup = backupFixture();
  assert.equal(Object.prototype.hasOwnProperty.call(oldBackup, "competitions"), false);
  const oldRestore = adminService.restoreBackup(actor, JSON.stringify(oldBackup));
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

  const result = adminService.restoreBackup(actor, JSON.stringify(invalidBackup));

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
  assert.throws(() => competitionService.createCompetition(actor, competitionInput()), /không thể ghi dữ liệu cuộc thi/i);
  assert.deepEqual(getValue(COMPETITION_STORAGE_KEY), original);

  values.delete(SESSION_KEY);
  assert.throws(() => competitionService.createCompetition(actor, competitionInput()), /chỉ Super Admin/i);
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
  assert.throws(
    () => competitionService.createCompetition(actor, competitionInput()),
    /snapshot cũ đã được khôi phục và xác minh/i
  );
  assert.deepEqual(getValue(COMPETITION_STORAGE_KEY), original);

  failCount = 0;
  failAfterSetCount = 1;
  assert.throws(
    () => competitionService.createCompetition(actor, competitionInput()),
    /snapshot cũ đã được khôi phục và xác minh/i
  );
  assert.deepEqual(getValue(COMPETITION_STORAGE_KEY), original);

  failAfterSetCount = 0;
  failReadAfterSetCount = 1;
  assert.throws(
    () => competitionService.createCompetition(actor, competitionInput()),
    /snapshot cũ đã được khôi phục và xác minh/i
  );
  assert.deepEqual(getValue(COMPETITION_STORAGE_KEY), original);

  failReadAfterSetCount = 0;
  mismatchReadAfterSetCount = 1;
  assert.throws(
    () => competitionService.createCompetition(actor, competitionInput()),
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

  assert.throws(
    () => competitionService.createCompetition(actor, competitionInput()),
    /rollback snapshot thất bại hoặc không xác minh được/i
  );
  assert.notDeepEqual(getValue(COMPETITION_STORAGE_KEY), original);
});

test("restore rolls back the competition key after a post-write failure and preserves all raw storage", async () => {
  const actor = await seedSuperAdmin();
  const originalCompetition = competitionService.createCompetition(actor, competitionInput({
    name: "Original competition",
  }));
  const originalCompetitionRaw = values.get(COMPETITION_STORAGE_KEY);
  assert.notEqual(originalCompetitionRaw, undefined);
  competitionService.createCompetition(actor, competitionInput({ name: "Backup competition" }));
  const newBackup = JSON.parse(adminService.exportBackup(actor)) as Record<string, unknown>;
  const backupCompetitions = (newBackup.competitions as { competitions: Competition[] }).competitions;
  assert.ok(backupCompetitions.some((item) => item.id !== originalCompetition.id));
  values.set(COMPETITION_STORAGE_KEY, originalCompetitionRaw as string);
  const rawSnapshot = new Map(values);

  failKey = COMPETITION_STORAGE_KEY;
  failAfterSetCount = 1;

  const result = adminService.restoreBackup(actor, JSON.stringify(newBackup));

  assert.equal(result.success, false);
  assert.equal(writeFailureTriggered, true);
  assert.notEqual(valueAtAfterSetFailure, originalCompetitionRaw);
  assert.equal(values.get(COMPETITION_STORAGE_KEY), originalCompetitionRaw);
  assert.deepEqual(values, rawSnapshot);
});

test("real XLSX workbook is read with FileReader and validated before import", async () => {
  const actor = await seedSuperAdmin();
  const competition = competitionService.createCompetition(actor, competitionInput());
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
    assert.throws(() => competitionService.importContestants(actor, competition.id, rows), /chưa nhập dòng nào/i);
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
