import {
  School,
  UserAccount,
  UserRole,
  Grade,
  SchoolClass,
  Teacher,
  Student,
  ActivityLog,
  AdminPermission,
  SystemStats,
  StoredUserAccount,
  StudentSession,
} from "../types/adminTypes";
import {
  hashPassword,
  generateSalt,
  createTamperProofToken,
  verifyTamperProofToken,
  verifyStudentToken,
} from "./cryptoService";
import { contentService } from "./contentService";
import { COMPETITION_STORAGE_KEY, isCompetitionData } from "../types/competitionTypes";
import { decryptBackupPayload, encryptBackupPayload } from "./secureBackup";
import {
  assertStorageWriteLockClear,
  withLocalStorageWriteLock,
} from "./storageWriteLock";
import { applyStorageStageAtomically, type StoragePort } from "./academicYearSync";

const STORAGE_KEY_PREFIX = "thcs_quang_chau_admin_";
const KEY_SCHOOL = STORAGE_KEY_PREFIX + "school";
const KEY_USERS = STORAGE_KEY_PREFIX + "users";
const KEY_GRADES = STORAGE_KEY_PREFIX + "grades";
const KEY_CLASSES = STORAGE_KEY_PREFIX + "classes";
const KEY_TEACHERS = STORAGE_KEY_PREFIX + "teachers";
const KEY_STUDENTS = STORAGE_KEY_PREFIX + "students";
const KEY_LOGS = STORAGE_KEY_PREFIX + "logs";
const KEY_SESSION = STORAGE_KEY_PREFIX + "session";
const KEY_STUDENT_SESSION = "thcs_quang_chau_student_session";
const KEY_CONTENT_QUESTIONS = "thcs_quang_chau_content_questions";
const KEY_CONTENT_POSTS = "thcs_quang_chau_content_posts";
const KEY_CONTENT_VIDEOS = "thcs_quang_chau_content_videos";
const KEY_CONTENT_ALBUMS = "thcs_quang_chau_content_albums";
const KEY_CONTENT_IMAGES = "thcs_quang_chau_content_images";
const KEY_STUDENT_QUIZ_RECORDS = "thcs_quang_chau_student_quiz_records";
const KEY_STUDENT_PLEDGES = "bdg_student_pledges";
export const BACKUP_SCHEMA_VERSION = 2;

const DEFAULT_SCHOOL: School = {
  id: "school-thcs-quang-chau",
  name: "Trường THCS Quảng Châu",
  code: "THCS-QC-NA",
  province: "Nghệ An",
  district: "Quảng Châu",
  academicYear: "2025-2026",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  status: "active",
};

const DEFAULT_GRADES: Grade[] = [
  {
    id: "grade-6",
    schoolId: DEFAULT_SCHOOL.id,
    level: 6,
    name: "Khối 6",
    academicYear: DEFAULT_SCHOOL.academicYear,
    description: "Khối 6 - Khởi đầu cấp THCS, giáo dục nhận thức và bình đẳng học đường",
    status: "active",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "grade-7",
    schoolId: DEFAULT_SCHOOL.id,
    level: 7,
    name: "Khối 7",
    academicYear: DEFAULT_SCHOOL.academicYear,
    description: "Khối 7 - Phát triển kỹ năng sống, sẻ chia việc nhà và tình bạn đẹp",
    status: "active",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "grade-8",
    schoolId: DEFAULT_SCHOOL.id,
    level: 8,
    name: "Khối 8",
    academicYear: DEFAULT_SCHOOL.academicYear,
    description: "Khối 8 - STEM, sáng tạo khoa học và phá bỏ rào cản định kiến giới",
    status: "active",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "grade-9",
    schoolId: DEFAULT_SCHOOL.id,
    level: 9,
    name: "Khối 9",
    academicYear: DEFAULT_SCHOOL.academicYear,
    description: "Khối 9 - Hướng nghiệp, tự do ước mơ và pháp luật bình đẳng giới",
    status: "active",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
];

const DEFAULT_CLASSES: SchoolClass[] = [
  {
    id: "class-6a1",
    schoolId: DEFAULT_SCHOOL.id,
    gradeId: "grade-6",
    gradeLevel: 6,
    name: "6A1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    homeroomTeacherName: "Cô Nguyễn Thị Mai",
    studentCount: 35,
    status: "active",
    roomNumber: "P.101",
    accessCode: "QC6A1",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "class-6a2",
    schoolId: DEFAULT_SCHOOL.id,
    gradeId: "grade-6",
    gradeLevel: 6,
    name: "6A2",
    academicYear: DEFAULT_SCHOOL.academicYear,
    homeroomTeacherName: "Thầy Lê Văn Hùng",
    studentCount: 36,
    status: "active",
    roomNumber: "P.102",
    accessCode: "QC6A2",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "class-7a1",
    schoolId: DEFAULT_SCHOOL.id,
    gradeId: "grade-7",
    gradeLevel: 7,
    name: "7A1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    homeroomTeacherName: "Cô Trần Thị Thu",
    studentCount: 38,
    status: "active",
    roomNumber: "P.201",
    accessCode: "QC7A1",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "class-8c1",
    schoolId: DEFAULT_SCHOOL.id,
    gradeId: "grade-8",
    gradeLevel: 8,
    name: "8C1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    homeroomTeacherName: "Thầy Phan Đình Trí",
    studentCount: 34,
    status: "active",
    roomNumber: "P.203",
    accessCode: "QC8C1",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "class-8c2",
    schoolId: DEFAULT_SCHOOL.id,
    gradeId: "grade-8",
    gradeLevel: 8,
    name: "8C2",
    academicYear: DEFAULT_SCHOOL.academicYear,
    homeroomTeacherName: "Cô Hoàng Thị Lan",
    studentCount: 35,
    status: "active",
    roomNumber: "P.204",
    accessCode: "QC8C2",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "class-9c1",
    schoolId: DEFAULT_SCHOOL.id,
    gradeId: "grade-9",
    gradeLevel: 9,
    name: "9C1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    homeroomTeacherName: "Thầy Vũ Minh Tuấn",
    studentCount: 32,
    status: "active",
    roomNumber: "P.301",
    accessCode: "QC9C1",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "class-9c2",
    schoolId: DEFAULT_SCHOOL.id,
    gradeId: "grade-9",
    gradeLevel: 9,
    name: "9C2",
    academicYear: DEFAULT_SCHOOL.academicYear,
    homeroomTeacherName: "Cô Phạm Thùy Linh",
    studentCount: 33,
    status: "active",
    roomNumber: "P.302",
    accessCode: "QC9C2",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
];

const DEFAULT_TEACHERS: Teacher[] = [
  {
    id: "teacher-1",
    schoolId: DEFAULT_SCHOOL.id,
    fullName: "Cô Nguyễn Thị Mai",
    email: "nguyenthimai@thcsquangchau.edu.vn",
    phone: "0912345601",
    subject: "Giáo dục Công dân & Kỹ năng sống",
    homeroomClassId: "class-6a1",
    homeroomClassName: "6A1",
    status: "active",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "teacher-2",
    schoolId: DEFAULT_SCHOOL.id,
    fullName: "Thầy Lê Văn Hùng",
    email: "levanhung@thcsquangchau.edu.vn",
    phone: "0912345602",
    subject: "Toán học & Tin học",
    homeroomClassId: "class-6a2",
    homeroomClassName: "6A2",
    status: "active",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "teacher-3",
    schoolId: DEFAULT_SCHOOL.id,
    fullName: "Thầy Phan Đình Trí",
    email: "phandinhtri@thcsquangchau.edu.vn",
    phone: "0912345603",
    subject: "Khoa học Tự nhiên & STEM",
    homeroomClassId: "class-8c1",
    homeroomClassName: "8C1",
    status: "active",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
];

const DEFAULT_STUDENTS: Student[] = [
  // Lớp 6A1 (GVCN Cô Nguyễn Thị Mai, Mã lớp: QC6A1)
  {
    id: "stu-6a1-01",
    schoolId: DEFAULT_SCHOOL.id,
    studentCode: "HS-2026-6A101",
    fullName: "Nguyễn Hoàng Nam",
    gender: "nam",
    birthDate: "2014-03-15",
    gradeLevel: 6,
    classId: "class-6a1",
    className: "6A1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    parentPhone: "0981112233",
    status: "studying",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "stu-6a1-02",
    schoolId: DEFAULT_SCHOOL.id,
    studentCode: "HS-2026-6A102",
    fullName: "Trần Khánh Linh",
    gender: "nu",
    birthDate: "2014-05-20",
    gradeLevel: 6,
    classId: "class-6a1",
    className: "6A1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    parentPhone: "0981112234",
    status: "studying",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "stu-6a1-03",
    schoolId: DEFAULT_SCHOOL.id,
    studentCode: "HS-2026-6A103",
    fullName: "Lê Quốc Bảo",
    gender: "nam",
    birthDate: "2014-08-10",
    gradeLevel: 6,
    classId: "class-6a1",
    className: "6A1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    parentPhone: "0981112235",
    status: "studying",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "stu-6a1-04",
    schoolId: DEFAULT_SCHOOL.id,
    studentCode: "HS-2026-6A104",
    fullName: "Phạm Quỳnh Anh",
    gender: "nu",
    birthDate: "2014-11-05",
    gradeLevel: 6,
    classId: "class-6a1",
    className: "6A1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    parentPhone: "0981112236",
    status: "locked", // Phục vụ kiểm thử tài khoản học sinh bị khóa
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  // Lớp 6A2 (GVCN Thầy Lê Văn Hùng, Mã lớp: QC6A2)
  {
    id: "stu-6a2-01",
    schoolId: DEFAULT_SCHOOL.id,
    studentCode: "HS-2026-6A201",
    fullName: "Lê Văn Minh",
    gender: "nam",
    birthDate: "2014-04-12",
    gradeLevel: 6,
    classId: "class-6a2",
    className: "6A2",
    academicYear: DEFAULT_SCHOOL.academicYear,
    parentPhone: "0982223344",
    status: "studying",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "stu-6a2-02",
    schoolId: DEFAULT_SCHOOL.id,
    studentCode: "HS-2026-6A202",
    fullName: "Đặng Thu Thảo",
    gender: "nu",
    birthDate: "2014-09-18",
    gradeLevel: 6,
    classId: "class-6a2",
    className: "6A2",
    academicYear: DEFAULT_SCHOOL.academicYear,
    parentPhone: "0982223345",
    status: "studying",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  // Lớp 7A1 (Mã lớp: QC7A1)
  {
    id: "stu-7a1-01",
    schoolId: DEFAULT_SCHOOL.id,
    studentCode: "HS-2026-7A101",
    fullName: "Nguyễn Đức Anh",
    gender: "nam",
    birthDate: "2013-02-14",
    gradeLevel: 7,
    classId: "class-7a1",
    className: "7A1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    parentPhone: "0983334455",
    status: "studying",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  // Lớp 8C1 (GVCN Thầy Phan Đình Trí, Mã lớp: QC8C1)
  {
    id: "stu-8c1-01",
    schoolId: DEFAULT_SCHOOL.id,
    studentCode: "HS-2026-8C101",
    fullName: "Hoàng Diệu Linh",
    gender: "nu",
    birthDate: "2012-07-25",
    gradeLevel: 8,
    classId: "class-8c1",
    className: "8C1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    parentPhone: "0984445566",
    status: "studying",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  {
    id: "stu-8c1-02",
    schoolId: DEFAULT_SCHOOL.id,
    studentCode: "HS-2026-8C102",
    fullName: "Phan Tuấn Kiệt",
    gender: "nam",
    birthDate: "2012-10-30",
    gradeLevel: 8,
    classId: "class-8c1",
    className: "8C1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    parentPhone: "0984445567",
    status: "studying",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
  // Lớp 9C1 (Mã lớp: QC9C1)
  {
    id: "stu-9c1-01",
    schoolId: DEFAULT_SCHOOL.id,
    studentCode: "HS-2026-9C101",
    fullName: "Trần Minh Quang",
    gender: "nam",
    birthDate: "2011-01-19",
    gradeLevel: 9,
    classId: "class-9c1",
    className: "9C1",
    academicYear: DEFAULT_SCHOOL.academicYear,
    parentPhone: "0985556677",
    status: "studying",
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "system",
  },
];


interface SessionData {
  userId: string;
  token: string;
  expiresAt: number; // timestamp ms
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStringFields(value: unknown, fields: string[]): value is Record<string, unknown> {
  return isRecord(value) && fields.every((field) => typeof value[field] === "string");
}

function isRecordArray(value: unknown, requiredFields: string[]): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(
    (item) => isRecord(item) && requiredFields.every((field) => typeof item[field] === "string")
  );
}

function isActivityLogArray(value: unknown): value is ActivityLog[] {
  return Array.isArray(value) && value.every((item) =>
    isRecord(item) &&
    ["id", "schoolId", "timestamp", "actorId", "actorName", "actorRole", "action", "entity", "details"]
      .every((field) => typeof item[field] === "string")
  );
}

function isStudentSession(value: unknown): value is StudentSession {
  return isRecord(value)
    && typeof value.studentId === "string"
    && typeof value.studentCode === "string"
    && typeof value.fullName === "string"
    && (value.gradeLevel === 6 || value.gradeLevel === 7 || value.gradeLevel === 8 || value.gradeLevel === 9)
    && typeof value.classId === "string"
    && typeof value.className === "string"
    && value.role === "student"
    && typeof value.token === "string"
    && typeof value.createdAt === "number"
    && Number.isFinite(value.createdAt)
    && typeof value.expiresAt === "number"
    && Number.isFinite(value.expiresAt);
}

function hasProtectedCredentials(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasProtectedCredentials);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, item]) =>
    ((key === "passwordHash" || key === "salt") && item === "[PROTECTED]") ||
    hasProtectedCredentials(item)
  );
}

class AdminService {
  private firebaseAuthMode = false;
  private firebaseSessionUser: UserAccount | null = null;

  enableFirebaseAuthMode(): void {
    this.firebaseAuthMode = true;
    this.firebaseSessionUser = null;
  }

  setFirebaseSessionUser(user: UserAccount | null): void {
    this.firebaseAuthMode = true;
    this.firebaseSessionUser = user;
  }

  private memoryStorage: Record<string, string> = {};

  private getStorageGroup(key: string): string {
    const groups: Record<string, string> = {
      [KEY_SCHOOL]: "thông tin trường",
      [KEY_USERS]: "tài khoản",
      [KEY_SESSION]: "phiên đăng nhập",
      [KEY_GRADES]: "khối",
      [KEY_CLASSES]: "lớp học",
      [KEY_TEACHERS]: "giáo viên",
      [KEY_STUDENTS]: "học sinh",
      [KEY_LOGS]: "nhật ký",
      [KEY_CONTENT_QUESTIONS]: "câu hỏi",
      [KEY_CONTENT_POSTS]: "bài viết",
      [KEY_CONTENT_VIDEOS]: "video",
      [KEY_CONTENT_ALBUMS]: "album hình ảnh",
      [KEY_CONTENT_IMAGES]: "hình ảnh",
      [KEY_STUDENT_QUIZ_RECORDS]: "kết quả học tập",
      [KEY_STUDENT_PLEDGES]: "cam kết học sinh",
    };
    return groups[key] || "dữ liệu hệ thống";
  }

  private readRawStorage(key: string): string | null {
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      return window.localStorage.getItem(key);
    }
    return this.memoryStorage[key] ?? null;
  }

  private writeRawStorage(key: string, value: string | null): void {
    assertStorageWriteLockClear();
    try {
      if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      } else if (value === null) {
        delete this.memoryStorage[key];
      } else {
        this.memoryStorage[key] = value;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Lỗi trình duyệt không xác định.";
      throw new Error(`${this.getStorageGroup(key)}: thao tác lưu trữ thất bại (${reason}).`);
    }

    try {
      if (this.readRawStorage(key) !== value) {
        throw new Error("Giá trị đọc lại không khớp sau thao tác.");
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Lỗi đọc xác minh không xác định.";
      throw new Error(`${this.getStorageGroup(key)}: không xác minh được trạng thái sau thao tác (${reason}).`);
    }
  }

  private persistAtomically(entries: Array<{ key: string; value?: unknown; remove?: boolean }>): void {
    assertStorageWriteLockClear();
    const snapshots = entries.map(({ key }) => ({ key, value: this.readRawStorage(key) }));
    const attempted: string[] = [];

    try {
      for (const { key, value, remove } of entries) {
        attempted.push(key);
        if (remove) {
          this.writeRawStorage(key, null);
        } else {
          const serialized = JSON.stringify(value);
          if (typeof serialized !== "string") {
            throw new Error(`${this.getStorageGroup(key)}: dữ liệu không thể chuyển thành JSON.`);
          }
          this.writeRawStorage(key, serialized);
        }
      }
    } catch (error) {
      const rollbackErrors: string[] = [];
      for (const key of attempted.reverse()) {
        const snapshot = snapshots.find((item) => item.key === key);
        const snapshotValue = snapshot?.value ?? null;
        try {
          this.writeRawStorage(key, snapshotValue);
        } catch {
          // Verify independently because a failed write may still have changed storage.
        }
        try {
          if (this.readRawStorage(key) !== snapshotValue) {
            rollbackErrors.push(this.getStorageGroup(key));
          }
        } catch {
          rollbackErrors.push(this.getStorageGroup(key));
        }
      }
      const reason = error instanceof Error ? error.message : "Lỗi lưu trữ không xác định.";
      if (rollbackErrors.length > 0) {
        throw new Error(`${reason} Không xác minh được trạng thái đã khôi phục cho: ${rollbackErrors.join(", ")}.`);
      }
      throw new Error(`${reason} Đã ghi lại và xác minh trạng thái trước đó cho mọi nhóm đã thử hoàn tác.`);
    }
  }

  private readBackupValue<T>(key: string, fallback: T): T {
    const raw = this.readRawStorage(key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  }

  private getStorage<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
        const data = window.localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
      }
      const memData = this.memoryStorage[key];
      return memData ? JSON.parse(memData) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      if (typeof serialized !== "string") {
        throw new Error("Dữ liệu không thể chuyển thành JSON.");
      }
      this.writeRawStorage(key, serialized);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Lỗi lưu trữ không xác định.";
      throw new Error(`Không thể ghi ${this.getStorageGroup(key)}: ${reason}`);
    }
  }

  private removeStorage(key: string): void {
    try {
      this.writeRawStorage(key, null);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Lỗi lưu trữ không xác định.";
      throw new Error(`Không thể xóa ${this.getStorageGroup(key)}: ${reason}`);
    }
  }

  // School
  getSchool(): School {
    return this.getStorage<School>(KEY_SCHOOL, DEFAULT_SCHOOL);
  }

  updateSchool(...args: Parameters<AdminService["updateSchoolUnlocked"]>): Promise<School> {
    return withLocalStorageWriteLock(() => this.updateSchoolUnlocked(...args));
  }

  private updateSchoolUnlocked(data: Partial<School>, actor: UserAccount): School {
    this.assertSuperAdmin(actor);
    const school = { ...this.getSchool(), ...data, updatedAt: new Date().toISOString() };
    this.setStorage(KEY_SCHOOL, school);
    this.logActivity(actor, "UPDATE_SCHOOL_INFO", "system", `Cập nhật thông tin nhà trường`);
    return school;
  }

  // Users & Setup
  private getInternalUsers(): StoredUserAccount[] {
    return this.getStorage<StoredUserAccount[]>(KEY_USERS, []);
  }

  private getSessionStoredUser(actor: UserAccount): UserAccount | null {
    if (this.firebaseAuthMode) {
      const sessionUser = this.firebaseSessionUser;
      return sessionUser?.id === actor.id && sessionUser.status === "active"
        ? sessionUser
        : null;
    }

    const sessionUser = this.getCurrentSessionUser();
    if (!sessionUser || sessionUser.id !== actor.id) return null;
    return this.getInternalUsers().find(
      (storedUser) => storedUser.id === sessionUser.id && storedUser.status === "active"
    ) || null;
  }

  getSessionActor(actor: UserAccount): UserAccount | null {
    return this.getSessionStoredUser(actor);
  }

  // Public/Component User retrieval: Sanitizes passwordHash and salt, requires super_admin
  getUsers(actor?: UserAccount): UserAccount[] {
    const activeActor = actor || this.getCurrentSessionUser();
    const storedActor = activeActor ? this.getSessionStoredUser(activeActor) : null;
    if (!storedActor || storedActor.role !== "super_admin") {
      return [];
    }
    return this.getInternalUsers().map(({ passwordHash: _passwordHash, salt: _salt, ...user }) => user);
  }

  getSuperAdmin(): UserAccount | undefined {
    const user = this.getInternalUsers().find((item) => item.role === "super_admin");
    if (!user) return undefined;
    const { passwordHash: _passwordHash, salt: _salt, ...summary } = user;
    return summary;
  }

  isSystemInitialized(): boolean {
    const persistentDataKeys = [
      KEY_SCHOOL,
      KEY_USERS,
      KEY_SESSION,
      KEY_GRADES,
      KEY_CLASSES,
      KEY_TEACHERS,
      KEY_STUDENTS,
      KEY_LOGS,
      KEY_CONTENT_QUESTIONS,
      KEY_CONTENT_POSTS,
      KEY_CONTENT_VIDEOS,
      KEY_CONTENT_ALBUMS,
      KEY_CONTENT_IMAGES,
      KEY_STUDENT_QUIZ_RECORDS,
      KEY_STUDENT_PLEDGES,
    ];
    return persistentDataKeys.some((key) => this.readRawStorage(key) !== null);
  }

  async initializeSuperAdmin(
    fullName: string,
    email: string,
    plainPassword: string,
    phone?: string
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    void fullName;
    void email;
    void plainPassword;
    void phone;
    return {
      success: false,
      error: "Không thể xác minh quyền quản trị trường bằng cơ chế tin cậy phía máy chủ. Bootstrap bị vô hiệu hóa; không tạo tài khoản.",
    };
  }

  authenticate(...args: Parameters<AdminService["authenticateUnlocked"]>): Promise<Awaited<ReturnType<AdminService["authenticateUnlocked"]>>> {
    return withLocalStorageWriteLock(() => this.authenticateUnlocked(...args));
  }

  private async authenticateUnlocked(
    email: string,
    plainPassword: string
  ): Promise<{ success: boolean; user?: UserAccount; token?: string; error?: string }> {
    if (this.firebaseAuthMode) {
      return {
        success: false,
        error: "Đăng nhập Local Storage đã bị vô hiệu hóa khi Firebase Auth được bật.",
      };
    }

    const users = this.getInternalUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      return { success: false, error: "Email hoặc mật khẩu không chính xác." };
    }

    if (user.status === "locked") {
      return { success: false, error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin chính." };
    }

    if (user.status === "pending") {
      return { success: false, error: "Tài khoản của bạn đang chờ phê duyệt và chưa được phép đăng nhập." };
    }

    if (user.status !== "active") {
      return { success: false, error: "Trạng thái tài khoản không hợp lệ. Không thể đăng nhập." };
    }

    if (
      user.passwordHash === "[PROTECTED]" ||
      user.salt === "[PROTECTED]" ||
      !/^[a-f\d]{64}$/i.test(user.passwordHash) ||
      !user.salt
    ) {
      return {
        success: false,
        error: "Thông tin xác thực của tài khoản không hợp lệ. Không tự động đặt lại mật khẩu; hãy liên hệ Admin chính để xác minh.",
      };
    }

    const computedHash = await hashPassword(plainPassword, user.salt);
    if (computedHash !== user.passwordHash) {
      return { success: false, error: "Email hoặc mật khẩu không chính xác." };
    }

    // Update lastLoginAt
    const now = new Date();
    user.lastLoginAt = now.toISOString();
    const expiresAt = now.getTime() + 60 * 60 * 1000;
    const token = createTamperProofToken(user.id, expiresAt);
    const session: SessionData = {
      userId: user.id,
      token,
      expiresAt,
    };
    const loginLog = this.createActivityLog(user, "LOGIN_SUCCESS", "user", "Đăng nhập thành công vào hệ thống quản trị");
    try {
      this.persistAtomically([
        { key: KEY_USERS, value: users.map((storedUser) => (storedUser.id === user.id ? user : storedUser)) },
        { key: KEY_SESSION, value: session },
        { key: KEY_LOGS, value: [loginLog, ...this.getInternalActivityLogs()].slice(0, 500) },
      ]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Lỗi lưu trữ không xác định.";
      return { success: false, error: `Không thể hoàn tất đăng nhập an toàn: ${reason}` };
    }

    const { passwordHash: _passwordHash, salt: _salt, ...publicUser } = user;
    return { success: true, user: publicUser, token };
  }

  getCurrentSessionUser(): UserAccount | null {
    if (this.firebaseAuthMode) return this.firebaseSessionUser;

    const session = this.getStorage<SessionData | null>(KEY_SESSION, null);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      return null;
    }

    // Cryptographic validation: Verify token has not been tampered in browser localStorage
    if (!verifyTamperProofToken(session.token, session.userId, session.expiresAt)) {
      console.warn("Cảnh báo an ninh: Phát hiện phiên đăng nhập bị can thiệp trái phép. Thu hồi phiên ngay lập tức.");
      return null;
    }

    const users = this.getInternalUsers();
    const user = users.find((u) => u.id === session.userId);
    if (!user || user.status === "locked") {
      return null;
    }

    const { passwordHash: _passwordHash, salt: _salt, ...publicUser } = user;
    return publicUser;
  }

  logout(): Promise<void> {
    return withLocalStorageWriteLock(() => this.logoutUnlocked());
  }

  private logoutUnlocked(): void {
    const session = this.getStorage<SessionData | null>(KEY_SESSION, null);
    if (!session) {
      this.removeStorage(KEY_SESSION);
      return;
    }

    const user = this.getInternalUsers().find((storedUser) => storedUser.id === session.userId);
    const entries: Array<{ key: string; value?: unknown; remove?: boolean }> = [];
    if (user) {
      const logoutLog = this.createActivityLog(user, "LOGOUT", "user", "Đăng xuất khỏi hệ thống");
      entries.push({ key: KEY_LOGS, value: [logoutLog, ...this.getInternalActivityLogs()].slice(0, 500) });
    }
    entries.push({ key: KEY_SESSION, remove: true });
    this.persistAtomically(entries);
  }

  // Sub-Admin Management (Only Super Admin)
  createSubAdmin(...args: Parameters<AdminService["createSubAdminUnlocked"]>): Promise<Awaited<ReturnType<AdminService["createSubAdminUnlocked"]>>> {
    return withLocalStorageWriteLock(() => this.createSubAdminUnlocked(...args));
  }

  private async createSubAdminUnlocked(
    actor: UserAccount,
    data: {
      fullName: string;
      email: string;
      plainPassword: string;
      permissions: AdminPermission[];
      phone?: string;
    }
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    this.assertSuperAdmin(actor);

    const users = this.getInternalUsers();
    const cleanEmail = data.email.trim().toLowerCase();

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: "Email này đã được sử dụng trong hệ thống." };
    }

    if (data.plainPassword.length < 6) {
      return { success: false, error: "Mật khẩu Admin phụ tối thiểu 6 ký tự." };
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(data.plainPassword, salt);
    const now = new Date().toISOString();

    const subAdmin: StoredUserAccount = {
      id: "admin-" + Date.now(),
      schoolId: DEFAULT_SCHOOL.id,
      fullName: data.fullName.trim(),
      email: cleanEmail,
      role: "admin",
      passwordHash,
      salt,
      status: "active",
      permissions: data.permissions || [],
      createdAt: now,
      updatedAt: now,
      createdBy: actor.fullName,
      phone: data.phone?.trim(),
    };

    this.setStorage(KEY_USERS, [...users, subAdmin]);
    this.logActivity(
      actor,
      "CREATE_SUB_ADMIN",
      "user",
      `Tạo tài khoản Admin phụ [${subAdmin.fullName} - ${subAdmin.email}] với ${subAdmin.permissions.length} quyền`
    );

    const { passwordHash: _passwordHash, salt: _salt, ...publicUser } = subAdmin;
    return { success: true, user: publicUser };
  }

  updateSubAdminPermissions(...args: Parameters<AdminService["updateSubAdminPermissionsUnlocked"]>): Promise<ReturnType<AdminService["updateSubAdminPermissionsUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.updateSubAdminPermissionsUnlocked(...args));
  }

  private updateSubAdminPermissionsUnlocked(
    actor: UserAccount,
    targetUserId: string,
    newPermissions: AdminPermission[]
  ): { success: boolean; error?: string } {
    this.assertSuperAdmin(actor);

    const users = this.getInternalUsers();
    const target = users.find((u) => u.id === targetUserId);

    if (!target) return { success: false, error: "Không tìm thấy người dùng." };
    if (target.role === "super_admin") {
      return { success: false, error: "Không thể chỉnh sửa quyền của Admin chính!" };
    }

    target.permissions = newPermissions;
    target.updatedAt = new Date().toISOString();

    this.setStorage(
      KEY_USERS,
      users.map((u) => (u.id === target.id ? target : u))
    );
    this.logActivity(
      actor,
      "UPDATE_PERMISSIONS",
      "permission",
      `Cập nhật quyền cho Admin phụ [${target.fullName}]: ${newPermissions.join(", ")}`
    );

    return { success: true };
  }

  toggleUserStatus(...args: Parameters<AdminService["toggleUserStatusUnlocked"]>): Promise<ReturnType<AdminService["toggleUserStatusUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.toggleUserStatusUnlocked(...args));
  }

  private toggleUserStatusUnlocked(
    actor: UserAccount,
    targetUserId: string
  ): { success: boolean; newStatus?: "active" | "locked"; error?: string } {
    this.assertSuperAdmin(actor);

    const users = this.getInternalUsers();
    const target = users.find((u) => u.id === targetUserId);

    if (!target) return { success: false, error: "Không tìm thấy người dùng." };
    if (target.role === "super_admin") {
      return { success: false, error: "Bảo mật: Không được phép khóa hoặc xóa tài khoản Admin chính!" };
    }

    const newStatus: "active" | "locked" = target.status === "active" ? "locked" : "active";
    target.status = newStatus;
    target.updatedAt = new Date().toISOString();

    this.setStorage(
      KEY_USERS,
      users.map((u) => (u.id === target.id ? target : u))
    );
    this.logActivity(
      actor,
      newStatus === "locked" ? "LOCK_USER" : "UNLOCK_USER",
      "user",
      `${newStatus === "locked" ? "Khóa" : "Mở khóa"} tài khoản [${target.fullName} - ${target.email}]`
    );

    return { success: true, newStatus };
  }

  // Grades (Khối)
  getGrades(schoolId?: string, academicYear?: string): Grade[] {
    const school = this.getSchool();
    const targetSchoolId = schoolId ?? school.id;
    const targetAcademicYear = academicYear ?? school.academicYear;
    return this.getStorage<Grade[]>(KEY_GRADES, DEFAULT_GRADES).filter(
      (grade) => grade.schoolId === targetSchoolId && grade.academicYear === targetAcademicYear
    );
  }

  getGradesForSchool(schoolId = this.getSchool().id): Grade[] {
    return this.getStorage<Grade[]>(KEY_GRADES, DEFAULT_GRADES).filter(
      (grade) => grade.schoolId === schoolId
    );
  }

  private findGradeForLevel(
    schoolId: string,
    academicYear: string,
    level: Grade["level"]
  ): Grade | null {
    const matches = this.getGrades(schoolId, academicYear).filter((grade) => grade.level === level);
    return matches.length === 1 ? matches[0] : null;
  }

  private classHasValidGrade(schoolClass: SchoolClass): boolean {
    const matches = this.getGrades(schoolClass.schoolId, schoolClass.academicYear).filter(
      (grade) => grade.id === schoolClass.gradeId && grade.level === schoolClass.gradeLevel
    );
    return matches.length === 1;
  }

  private normalizeAccessCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private hasDuplicateAccessCode(
    classes: SchoolClass[],
    schoolId: string,
    accessCode: string,
    excludedClassId?: string
  ): boolean {
    const normalizedCode = this.normalizeAccessCode(accessCode);
    return classes.some((schoolClass) =>
      schoolClass.schoolId === schoolId
      && schoolClass.id !== excludedClassId
      && this.normalizeAccessCode(
        schoolClass.accessCode || `QC${schoolClass.name.replace(/[^A-Z0-9]/gi, "")}`
      ) === normalizedCode
    );
  }

  private countsTowardClassSize(status: Student["status"]): boolean {
    switch (status) {
      case "studying":
      case "locked":
        return true;
      case "transferred":
      case "graduated":
        return false;
      default: {
        const exhaustiveStatus: never = status;
        throw new Error(`Trạng thái học sinh không hợp lệ: ${exhaustiveStatus}`);
      }
    }
  }

  private recalculateClassCounts(
    classes: SchoolClass[],
    students: Student[],
    affectedClassIds: string[],
    updatedAt: string
  ): SchoolClass[] {
    const affectedIds = new Set(affectedClassIds);
    const classIds = new Set(classes.map((schoolClass) => schoolClass.id));

    for (const classId of affectedIds) {
      if (!classIds.has(classId)) throw new Error("Không thể tính sĩ số: không tìm thấy lớp liên quan.");
    }

    const counts = new Map<string, number>();
    for (const classId of affectedIds) counts.set(classId, 0);

    for (const student of students) {
      if (!affectedIds.has(student.classId) || !this.countsTowardClassSize(student.status)) continue;
      counts.set(student.classId, (counts.get(student.classId) ?? 0) + 1);
    }

    return classes.map((schoolClass) => {
      const count = counts.get(schoolClass.id);
      return count === undefined
        ? schoolClass
        : { ...schoolClass, studentCount: count, updatedAt };
    });
  }

  // Classes (Lớp)
  getClasses(): SchoolClass[] {
    const list = this.getStorage<SchoolClass[]>(KEY_CLASSES, DEFAULT_CLASSES);
    return list.map((c) => ({
      ...c,
      accessCode: c.accessCode || `QC${c.name.replace(/[^A-Z0-9]/gi, "")}`,
    }));
  }

  getClassDeletionEligibility(
    actor: UserAccount,
    classId: string
  ): { allowed: boolean; studentCount: number; reason?: string } {
    this.assertPermission(actor, "manage_classes");
    try {
      const classes = this.getVerifiedStoredRecords(KEY_CLASSES, DEFAULT_CLASSES);
      if (classes.some((schoolClass) =>
        typeof schoolClass.id !== "string"
        || typeof schoolClass.name !== "string"
        || typeof schoolClass.studentCount !== "number"
      )) {
        throw new Error("Danh sách lớp không đúng định dạng.");
      }
      const target = classes.find((schoolClass) => schoolClass.id === classId);
      if (!target) return { allowed: false, studentCount: 0, reason: "Không tìm thấy lớp học." };
      const targetName = target.name;
      const targetStudentCount = target.studentCount;
      if (typeof targetName !== "string" || typeof targetStudentCount !== "number") {
        throw new Error("Thông tin lớp không đủ để xác minh điều kiện xóa.");
      }

      const students = this.getVerifiedStoredRecords(KEY_STUDENTS, DEFAULT_STUDENTS);
      if (students.some((student) => typeof student.classId !== "string")) {
        throw new Error("Danh sách học sinh không đủ thông tin lớp.");
      }
      const studentCount = students.filter((student) => student.classId === classId).length;
      if (studentCount > 0 || targetStudentCount > 0) {
        return {
          allowed: false,
          studentCount: Math.max(studentCount, targetStudentCount),
          reason: "Lớp còn học sinh liên quan. Hãy lưu trữ lớp để giữ nguyên dữ liệu.",
        };
      }

      const teachers = this.getVerifiedStoredRecords(KEY_TEACHERS, DEFAULT_TEACHERS);
      if (teachers.some((teacher) =>
        teacher.homeroomClassId !== undefined && typeof teacher.homeroomClassId !== "string"
      )) {
        throw new Error("Thông tin phân công giáo viên không đúng định dạng.");
      }
      if (
        target.homeroomTeacherId
        || target.homeroomTeacherName
        || teachers.some((teacher) => teacher.homeroomClassId === classId)
      ) {
        return {
          allowed: false,
          studentCount,
          reason: "Lớp đang được gán giáo viên chủ nhiệm. Hãy cập nhật quan hệ trước khi xóa.",
        };
      }

      const historicalRecords = [
        ...this.getClassHistoryRecords(KEY_STUDENT_QUIZ_RECORDS, classId, targetName),
        ...this.getClassHistoryRecords(KEY_STUDENT_PLEDGES, classId, targetName),
      ];
      if (historicalRecords.length > 0) {
        return {
          allowed: false,
          studentCount,
          reason: "Lớp có dữ liệu lịch sử học tập hoặc cam kết. Hãy lưu trữ để bảo toàn lịch sử.",
        };
      }
      return { allowed: true, studentCount };
    } catch (error) {
      return {
        allowed: false,
        studentCount: 0,
        reason: error instanceof Error
          ? `Không thể xác minh dữ liệu liên quan; xóa đã bị chặn. ${error.message}`
          : "Không thể xác minh dữ liệu liên quan; xóa đã bị chặn.",
      };
    }
  }

  private getVerifiedStoredRecords(key: string, fallback: unknown[]): Record<string, unknown>[] {
    const raw = this.readRawStorage(key);
    const value: unknown = raw === null ? fallback : JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(isRecord)) {
      throw new Error("Dữ liệu liên quan không đúng định dạng.");
    }
    return value;
  }

  setClassArchived(...args: Parameters<AdminService["setClassArchivedUnlocked"]>): Promise<ReturnType<AdminService["setClassArchivedUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.setClassArchivedUnlocked(...args));
  }

  private setClassArchivedUnlocked(
    actor: UserAccount,
    classId: string,
    archived: boolean
  ): { success: boolean; schoolClass?: SchoolClass; error?: string } {
    this.assertPermission(actor, "manage_classes");
    const classes = this.getClasses();
    const target = classes.find((schoolClass) => schoolClass.id === classId);
    if (!target) return { success: false, error: "Không tìm thấy lớp học." };
    const status: SchoolClass["status"] = archived ? "archived" : "active";
    if (target.status === status) return { success: true, schoolClass: target };

    const updatedClass = { ...target, status, updatedAt: new Date().toISOString() };
    const action = archived ? "ARCHIVE_CLASS" : "RESTORE_CLASS";
    const activity = this.createActivityLog(
      actor,
      action,
      "class",
      `${archived ? "Lưu trữ" : "Khôi phục"} lớp [${target.name}]; giữ nguyên học sinh và dữ liệu lịch sử.`,
      target.id
    );
    try {
      this.persistAtomically([
        { key: KEY_CLASSES, value: classes.map((item) => item.id === classId ? updatedClass : item) },
        { key: KEY_LOGS, value: [activity, ...this.getInternalActivityLogs()].slice(0, 500) },
      ]);
      return { success: true, schoolClass: updatedClass };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Không thể cập nhật trạng thái lưu trữ lớp.",
      };
    }
  }

  private getClassHistoryRecords(key: string, classId: string, className: string): unknown[] {
    const raw = this.readRawStorage(key);
    if (raw === null) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(isRecord)) {
      throw new Error("Dữ liệu lịch sử không đúng định dạng.");
    }
    if (value.some((record) =>
      record.classId !== undefined && typeof record.classId !== "string"
      || record.className !== undefined && typeof record.className !== "string"
    )) {
      throw new Error("Dữ liệu lịch sử lớp không đúng định dạng.");
    }
    return value.filter((record) => record.classId === classId || record.className === className);
  }

  deleteClass(...args: Parameters<AdminService["deleteClassUnlocked"]>): Promise<ReturnType<AdminService["deleteClassUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.deleteClassUnlocked(...args));
  }

  private deleteClassUnlocked(
    actor: UserAccount,
    classId: string
  ): { success: boolean; schoolClass?: SchoolClass; studentCount: number; error?: string } {
    this.assertPermission(actor, "manage_classes");
    const eligibility = this.getClassDeletionEligibility(actor, classId);
    if (!eligibility.allowed) {
      return { success: false, studentCount: eligibility.studentCount, error: eligibility.reason };
    }

    const classes = this.getClasses();
    const schoolClass = classes.find((item) => item.id === classId);
    if (!schoolClass) {
      return { success: false, studentCount: 0, error: "Không tìm thấy lớp học." };
    }

    try {
      const activity = this.createActivityLog(
        actor,
        "DELETE_CLASS",
        "class",
        `Xóa lớp [${schoolClass.name}] sau khi xác minh không còn học sinh, giáo viên chủ nhiệm hoặc lịch sử liên quan.`,
        schoolClass.id
      );
      this.persistAtomically([
        { key: KEY_CLASSES, value: classes.filter((item) => item.id !== classId) },
        { key: KEY_LOGS, value: [activity, ...this.getInternalActivityLogs()].slice(0, 500) },
      ]);
      return { success: true, schoolClass, studentCount: eligibility.studentCount };
    } catch (error) {
      return {
        success: false,
        studentCount: eligibility.studentCount,
        error: error instanceof Error ? error.message : "Không thể xóa lớp học.",
      };
    }
  }

  createClass(...args: Parameters<AdminService["createClassUnlocked"]>): Promise<ReturnType<AdminService["createClassUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.createClassUnlocked(...args));
  }

  private createClassUnlocked(
    actor: UserAccount,
    data: {
      name: string;
      gradeLevel: 6 | 7 | 8 | 9;
      academicYear?: string;
      homeroomTeacherId?: string;
      homeroomTeacherName?: string;
      roomNumber?: string;
      accessCode?: string;
    }
  ): { success: boolean; schoolClass?: SchoolClass; error?: string } {
    this.assertPermission(actor, "manage_classes");

    const classes = this.getClasses();
    const cleanName = data.name.trim().toUpperCase();
    const school = this.getSchool();
    const academicYear = data.academicYear?.trim() || school.academicYear;
    if (!cleanName) return { success: false, error: "Vui lòng nhập tên lớp." };
    if (!academicYear) return { success: false, error: "Vui lòng chọn năm học hợp lệ." };

    // Check duplicate class name in same grade and academic year
    const isDuplicate = classes.some(
      (c) =>
        c.schoolId === school.id &&
        c.name.toUpperCase() === cleanName &&
        c.gradeLevel === data.gradeLevel &&
        c.academicYear === academicYear &&
        c.status !== "archived"
    );

    if (isDuplicate) {
      return {
        success: false,
        error: `Lớp "${cleanName}" đã tồn tại trong Khối ${data.gradeLevel} (Năm học ${academicYear})! Vui lòng đặt tên khác.`,
      };
    }

    const grade = this.findGradeForLevel(school.id, academicYear, data.gradeLevel);
    if (!grade) {
      return {
        success: false,
        error: "Không tìm thấy duy nhất khối học tương ứng trong trường và năm học đã chọn.",
      };
    }
    const now = new Date().toISOString();
    const accessCode = this.normalizeAccessCode(
      data.accessCode || `QC${cleanName.replace(/[^A-Z0-9]/gi, "")}`
    );
    if (this.hasDuplicateAccessCode(classes, school.id, accessCode)) {
      return { success: false, error: "Mã lớp đã được sử dụng trong trường." };
    }

    const newClass: SchoolClass = {
      id: "class-" + Date.now(),
      schoolId: school.id,
      gradeId: grade.id,
      gradeLevel: grade.level,
      name: cleanName,
      academicYear: grade.academicYear,
      homeroomTeacherId: data.homeroomTeacherId,
      homeroomTeacherName: data.homeroomTeacherName,
      studentCount: 0,
      status: "active",
      roomNumber: data.roomNumber?.trim(),
      accessCode,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.fullName,
    };

    this.setStorage(KEY_CLASSES, [...classes, newClass]);
    this.logActivity(
      actor,
      "CREATE_CLASS",
      "class",
      `Tạo mới lớp học [${newClass.name}] thuộc Khối ${newClass.gradeLevel} (GVCN: ${newClass.homeroomTeacherName || "Chưa gán"})`
    );

    return { success: true, schoolClass: newClass };
  }

  updateClass(...args: Parameters<AdminService["updateClassUnlocked"]>): Promise<ReturnType<AdminService["updateClassUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.updateClassUnlocked(...args));
  }

  private updateClassUnlocked(
    actor: UserAccount,
    classId: string,
    updates: {
      name?: string;
      gradeLevel?: 6 | 7 | 8 | 9;
      academicYear?: string;
      homeroomTeacherId?: string;
      homeroomTeacherName?: string;
      roomNumber?: string;
      status?: "active" | "archived" | "locked";
      accessCode?: string;
    }
  ): { success: boolean; error?: string } {
    this.assertPermission(actor, "manage_classes");

    const classes = this.getClasses();
    const target = classes.find((c) => c.id === classId);
    if (!target) return { success: false, error: "Không tìm thấy lớp học." };

    const cleanName = updates.name === undefined ? target.name : updates.name.trim().toUpperCase();
    if (!cleanName) return { success: false, error: "Vui lòng nhập tên lớp." };
    const gradeLevel = updates.gradeLevel ?? target.gradeLevel;
    const academicYear = updates.academicYear?.trim() || target.academicYear;
    if (!academicYear) return { success: false, error: "Vui lòng chọn năm học hợp lệ." };
    const grade = updates.gradeLevel === undefined && updates.academicYear === undefined
      ? null
      : this.findGradeForLevel(target.schoolId, academicYear, gradeLevel);
    if ((updates.gradeLevel !== undefined || updates.academicYear !== undefined) && !grade) {
      return {
        success: false,
        error: "Không tìm thấy duy nhất khối học tương ứng trong trường và năm học của lớp.",
      };
    }

    const hasClassIdentityChange =
      cleanName !== target.name || gradeLevel !== target.gradeLevel || academicYear !== target.academicYear;
    if (hasClassIdentityChange && classes.some((schoolClass) =>
      schoolClass.id !== classId
      && schoolClass.schoolId === target.schoolId
      && schoolClass.name.toUpperCase() === cleanName
      && schoolClass.gradeLevel === gradeLevel
      && schoolClass.academicYear === academicYear
      && schoolClass.status !== "archived"
    )) {
      return { success: false, error: "Tên lớp đã tồn tại trong cùng trường, khối và năm học." };
    }

    const accessCode = updates.accessCode === undefined
      ? target.accessCode || `QC${cleanName.replace(/[^A-Z0-9]/gi, "")}`
      : this.normalizeAccessCode(
        updates.accessCode || `QC${cleanName.replace(/[^A-Z0-9]/gi, "")}`
      );
    if (
      updates.accessCode !== undefined
      && this.hasDuplicateAccessCode(classes, target.schoolId, accessCode, classId)
    ) {
      return { success: false, error: "Mã lớp đã được sử dụng trong trường." };
    }

    const now = new Date().toISOString();
    const updatedClass: SchoolClass = {
      ...target,
      name: cleanName,
      gradeId: grade?.id ?? target.gradeId,
      gradeLevel: grade?.level ?? target.gradeLevel,
      academicYear: grade?.academicYear ?? target.academicYear,
      ...(updates.homeroomTeacherId !== undefined
        ? { homeroomTeacherId: updates.homeroomTeacherId }
        : {}),
      ...(updates.homeroomTeacherName !== undefined
        ? { homeroomTeacherName: updates.homeroomTeacherName }
        : {}),
      ...(updates.roomNumber !== undefined ? { roomNumber: updates.roomNumber } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      accessCode,
      updatedAt: now,
    };

    const updatedClasses = classes.map((schoolClass) =>
      schoolClass.id === classId ? updatedClass : schoolClass
    );
    const students = this.getInternalStudents();
    const updatedStudents = students.map((student) => {
      if (student.classId !== classId) return student;
      if (
        student.className === updatedClass.name
        && student.gradeLevel === updatedClass.gradeLevel
        && student.academicYear === updatedClass.academicYear
      ) {
        return student;
      }
      return {
        ...student,
        className: updatedClass.name,
        gradeLevel: updatedClass.gradeLevel,
        academicYear: updatedClass.academicYear,
        updatedAt: now,
      };
    });
    const studentsChanged = updatedStudents.some((student, index) => student !== students[index]);
    const entries: Array<{ key: string; value: unknown }> = [
      { key: KEY_CLASSES, value: updatedClasses },
    ];
    if (studentsChanged) entries.push({ key: KEY_STUDENTS, value: updatedStudents });
    this.persistAtomically(entries);
    this.logActivity(actor, "UPDATE_CLASS", "class", `Cập nhật thông tin lớp [${target.name}]`);

    return { success: true };
  }

  // Teachers
  getTeachers(actor?: UserAccount): Teacher[] {
    const activeActor = actor || this.getCurrentSessionUser();
    if (!activeActor || !this.getSessionStoredUser(activeActor)) {
      return []; // Unauthenticated access blocked
    }
    return this.getStorage<Teacher[]>(KEY_TEACHERS, DEFAULT_TEACHERS);
  }

  createTeacher(...args: Parameters<AdminService["createTeacherUnlocked"]>): Promise<ReturnType<AdminService["createTeacherUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.createTeacherUnlocked(...args));
  }

  private createTeacherUnlocked(
    actor: UserAccount,
    data: { fullName: string; email: string; phone: string; subject: string; homeroomClassId?: string }
  ): { success: boolean; teacher?: Teacher; error?: string } {
    this.assertPermission(actor, "manage_teachers");

    const teachers = this.getTeachers();
    const now = new Date().toISOString();
    const classes = this.getClasses();
    const homeroomClass = classes.find((c) => c.id === data.homeroomClassId);

    const newTeacher: Teacher = {
      id: "teacher-" + Date.now(),
      schoolId: DEFAULT_SCHOOL.id,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      subject: data.subject.trim(),
      homeroomClassId: data.homeroomClassId,
      homeroomClassName: homeroomClass?.name,
      status: "active",
      createdAt: now,
      updatedAt: now,
      createdBy: actor.fullName,
    };

    this.setStorage(KEY_TEACHERS, [...teachers, newTeacher]);
    this.logActivity(actor, "CREATE_TEACHER", "teacher", `Thêm giáo viên mới: ${newTeacher.fullName} (${newTeacher.subject})`);

    return { success: true, teacher: newTeacher };
  }

  // Internal student retrieval with fallback to seeded default students
  getInternalStudents(): Student[] {
    return this.getStorage<Student[]>(KEY_STUDENTS, DEFAULT_STUDENTS);
  }

  // Students & Transfer
  getStudents(actor?: UserAccount, classIdFilter?: string): Student[] {
    const activeActor = actor || this.getCurrentSessionUser();
    const storedActor = activeActor ? this.getSessionStoredUser(activeActor) : null;
    if (!activeActor || !storedActor) {
      return []; // Unauthenticated access blocked
    }

    // 6. Học sinh tuyệt đối không được truy cập danh bạ học sinh toàn trường
    if (storedActor.role === "student") {
      return [];
    }

    const allStudents = this.getInternalStudents();

    // 5. Giáo viên chỉ được xem danh sách học sinh lớp mình chủ nhiệm
    if (storedActor.role === "teacher") {
      const teachers = this.getStorage<Teacher[]>(KEY_TEACHERS, DEFAULT_TEACHERS);
      const teacherProfile = teachers.find(
        (t) => t.email.toLowerCase() === storedActor.email.toLowerCase()
      );
      if (!teacherProfile || !teacherProfile.homeroomClassId) {
        return []; // Giáo viên không có lớp chủ nhiệm không được xem dữ liệu học sinh lớp khác
      }
      return allStudents.filter((s) => s.classId === teacherProfile.homeroomClassId);
    }

    // Admin phụ: Phải có quyền manage_students hoặc view_reports
    if (storedActor.role === "admin") {
      if (!this.hasPermission(storedActor, "manage_students") && !this.hasPermission(storedActor, "view_reports")) {
        return [];
      }
    }

    // Super Admin hoặc Admin phụ được cấp quyền
    if (classIdFilter && classIdFilter !== "all") {
      return allStudents.filter((s) => s.classId === classIdFilter);
    }
    return allStudents;
  }

  // Lấy học sinh nội bộ theo lớp phục vụ xác thực đăng nhập (không trả về trực tiếp cho client chưa xác thực)
  getInternalStudentsByClass(classId: string): Student[] {
    return this.getInternalStudents().filter((s) => s.classId === classId);
  }

  getCountedStudentCount(classId: string): number {
    return this.getInternalStudentsByClass(classId).filter(
      (student) => this.countsTowardClassSize(student.status)
    ).length;
  }

  // Xác thực lớp học và mã lớp dùng chung
  verifyClassAccessCode(
    gradeLevel: number,
    classId: string,
    inputCode: string
  ): { valid: boolean; schoolClass?: SchoolClass; error?: string } {
    const classes = this.getClasses();
    const targetClass = classes.find((c) => c.id === classId && c.gradeLevel === gradeLevel);

    if (!targetClass) {
      return { valid: false, error: "Lớp học không tồn tại hoặc không thuộc khối đã chọn!" };
    }

    if (targetClass.status === "locked") {
      return { valid: false, error: "Lớp học này hiện đang bị khóa tạm thời. Vui lòng liên hệ GVCN hoặc Nhà trường!" };
    }

    if (targetClass.status === "archived") {
      return { valid: false, error: "Lớp học này đã kết thúc lưu trữ. Không thể đăng nhập!" };
    }

    const expectedCode = targetClass.accessCode || `QC${targetClass.name.replace(/[^A-Z0-9]/gi, "")}`;
    if (expectedCode.trim().toUpperCase() !== inputCode.trim().toUpperCase()) {
      return { valid: false, error: "Mã lớp dùng chung không chính xác. Vui lòng kiểm tra lại với GVCN!" };
    }

    return { valid: true, schoolClass: targetClass };
  }

  // Tìm học sinh theo họ và tên trong lớp (chuẩn hóa tiếng Việt, không phân biệt hoa thường)
  findStudentInClass(classId: string, inputFullName: string): { student?: Student; error?: string } {
    const studentsInClass = this.getInternalStudentsByClass(classId);
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const cleanInput = normalize(inputFullName);
    const matched = studentsInClass.find((s) => normalize(s.fullName) === cleanInput);

    if (!matched) {
      return {
        error: `Không tìm thấy học sinh mang tên "${inputFullName.trim()}" trong danh sách lớp. Vui lòng nhập đúng họ và tên có dấu theo danh sách lớp.`,
      };
    }

    if (matched.status === "locked") {
      return {
        error: `Tài khoản học sinh "${matched.fullName}" (${matched.studentCode}) đang bị tạm khóa. Vui lòng liên hệ GVCN để mở khóa!`,
      };
    }

    return { student: matched };
  }

  private readStorageForActivityActor(key: string): string | null {
    try {
      return this.readRawStorage(key);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Lỗi lưu trữ không xác định.";
      throw new Error(`Không thể xác minh tác nhân nhật ký: ${reason}`);
    }
  }

  private getAuthenticatedAdminActivityActor(): Pick<UserAccount, "id" | "fullName" | "role" | "status"> | null {
    if (this.firebaseAuthMode) {
      const user = this.firebaseSessionUser;
      return user?.status === "active"
        ? { id: user.id, fullName: user.fullName, role: user.role, status: user.status }
        : null;
    }

    const rawSession = this.readStorageForActivityActor(KEY_SESSION);
    if (rawSession === null) return null;

    let session: unknown;
    try {
      session = JSON.parse(rawSession);
    } catch {
      return null;
    }
    if (
      !isRecord(session)
      || typeof session.userId !== "string"
      || typeof session.token !== "string"
      || typeof session.expiresAt !== "number"
      || !Number.isFinite(session.expiresAt)
      || Date.now() > session.expiresAt
      || !verifyTamperProofToken(session.token, session.userId, session.expiresAt)
    ) {
      return null;
    }

    const rawUsers = this.readStorageForActivityActor(KEY_USERS);
    if (rawUsers === null) return null;
    let users: unknown;
    try {
      users = JSON.parse(rawUsers);
    } catch {
      return null;
    }
    if (!Array.isArray(users)) return null;

    const storedUser = users.find((user) => isRecord(user) && user.id === session.userId);
    if (
      !isRecord(storedUser)
      || typeof storedUser.id !== "string"
      || typeof storedUser.fullName !== "string"
      || storedUser.status !== "active"
      || (
        storedUser.role !== "super_admin"
        && storedUser.role !== "admin"
        && storedUser.role !== "teacher"
        && storedUser.role !== "student"
      )
    ) {
      return null;
    }
    return {
      id: storedUser.id,
      fullName: storedUser.fullName,
      role: storedUser.role,
      status: "active",
    };
  }

  private isAuthenticatedExternalActivityActor(
    actorId: string,
    actorName: string,
    actorRole: UserRole
  ): boolean {
    if (!actorId || !actorName) return false;
    if (actorRole === "student") {
      const rawSession = this.readStorageForActivityActor(KEY_STUDENT_SESSION);
      if (rawSession === null) return false;

      let session: unknown;
      try {
        session = JSON.parse(rawSession);
      } catch {
        return false;
      }
      if (
        !isStudentSession(session)
        || session.studentId !== actorId
        || session.fullName !== actorName
        || Date.now() > session.expiresAt
        || !verifyStudentToken(session.token, session.studentId, session.classId, session.expiresAt)
      ) {
        return false;
      }

      const studentCheck = this.findStudentInClass(session.classId, session.fullName);
      return studentCheck.student?.id === session.studentId
        && studentCheck.student.studentCode === session.studentCode
        && studentCheck.student.status !== "locked";
    }

    const authenticatedActor = this.getAuthenticatedAdminActivityActor();
    return authenticatedActor?.id === actorId
      && authenticatedActor.fullName === actorName
      && authenticatedActor.role === actorRole
      && authenticatedActor.status === "active";
  }

  // Ghi nhật ký hoạt động từ các cổng ngoài (Cổng học sinh, Cổng giáo viên)
  logExternalActivity(...args: Parameters<AdminService["logExternalActivityUnlocked"]>): Promise<boolean> {
    return withLocalStorageWriteLock(() => this.logExternalActivityUnlocked(...args));
  }

  logExternalActivityWhileWriteLocked(
    ...args: Parameters<AdminService["logExternalActivityUnlocked"]>
  ): boolean {
    assertStorageWriteLockClear();
    return this.logExternalActivityUnlocked(...args);
  }

  private logExternalActivityUnlocked(
    actorId: string,
    actorName: string,
    actorRole: UserRole,
    action: string,
    entity: ActivityLog["entity"],
    details: string
  ): boolean {
    if (!this.isAuthenticatedExternalActivityActor(actorId, actorName, actorRole)) {
      return false;
    }
    const logs = this.getInternalActivityLogs();
    const newLog: ActivityLog = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      schoolId: DEFAULT_SCHOOL.id,
      timestamp: new Date().toISOString(),
      actorId,
      actorName,
      actorRole,
      action,
      entity,
      details,
    };
    this.persistAtomically([{ key: KEY_LOGS, value: [newLog, ...logs].slice(0, 500) }]);
    return true;
  }

  createStudent(...args: Parameters<AdminService["createStudentUnlocked"]>): Promise<ReturnType<AdminService["createStudentUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.createStudentUnlocked(...args));
  }

  private createStudentUnlocked(
    actor: UserAccount,
    data: {
      fullName: string;
      studentCode: string;
      gender: "nam" | "nu";
      birthDate: string;
      classId: string;
      parentPhone?: string;
    }
  ): { success: boolean; student?: Student; error?: string } {
    this.assertPermission(actor, "manage_students");

    const students = this.getStudents();
    const classes = this.getClasses();
    const targetClass = classes.find((c) => c.id === data.classId);

    if (!targetClass) return { success: false, error: "Vui lòng chọn lớp hợp lệ." };
    if (!this.classHasValidGrade(targetClass)) {
      return { success: false, error: "Khối, lớp và năm học không khớp dữ liệu đã đăng ký." };
    }

    const cleanCode = data.studentCode.trim().toUpperCase();
    if (students.some((s) => s.studentCode.toUpperCase() === cleanCode)) {
      return { success: false, error: `Mã học sinh "${cleanCode}" đã tồn tại trên hệ thống.` };
    }

    const now = new Date().toISOString();
    const newStudent: Student = {
      id: "student-" + Date.now(),
      schoolId: targetClass.schoolId,
      studentCode: cleanCode,
      fullName: data.fullName.trim(),
      gender: data.gender,
      birthDate: data.birthDate,
      gradeLevel: targetClass.gradeLevel,
      classId: targetClass.id,
      className: targetClass.name,
      academicYear: targetClass.academicYear,
      parentPhone: data.parentPhone?.trim(),
      status: "studying",
      createdAt: now,
      updatedAt: now,
      createdBy: actor.fullName,
    };

    const updatedStudents = [...students, newStudent];
    const updatedClasses = this.recalculateClassCounts(
      classes,
      updatedStudents,
      [targetClass.id],
      now
    );
    this.persistAtomically([
      { key: KEY_CLASSES, value: updatedClasses },
      { key: KEY_STUDENTS, value: updatedStudents },
    ]);

    this.logActivity(
      actor,
      "CREATE_STUDENT",
      "student",
      `Thêm học sinh [${newStudent.fullName} - ${newStudent.studentCode}] vào lớp ${newStudent.className}`
    );

    return { success: true, student: newStudent };
  }

  transferStudent(...args: Parameters<AdminService["transferStudentUnlocked"]>): Promise<ReturnType<AdminService["transferStudentUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.transferStudentUnlocked(...args));
  }

  private transferStudentUnlocked(
    actor: UserAccount,
    studentId: string,
    newClassId: string
  ): { success: boolean; error?: string } {
    this.assertPermission(actor, "manage_students");

    const students = this.getStudents();
    const classes = this.getClasses();

    const student = students.find((s) => s.id === studentId);
    if (!student) return { success: false, error: "Không tìm thấy học sinh." };

    const newClass = classes.find((c) => c.id === newClassId);
    if (!newClass) return { success: false, error: "Lớp chuyển đến không hợp lệ." };
    const oldClass = classes.find((c) => c.id === student.classId);
    if (!oldClass) return { success: false, error: "Không tìm thấy lớp hiện tại của học sinh." };
    if (!this.classHasValidGrade(newClass)) {
      return { success: false, error: "Khối, lớp và năm học của lớp chuyển đến không khớp." };
    }

    if (student.classId === newClassId) {
      return { success: false, error: "Học sinh hiện đã ở lớp này rồi." };
    }

    const oldClassName = student.className;
    const oldClassId = student.classId;

    // Update student
    student.classId = newClass.id;
    student.className = newClass.name;
    student.gradeLevel = newClass.gradeLevel;
    student.academicYear = newClass.academicYear;
    student.schoolId = newClass.schoolId;
    student.updatedAt = new Date().toISOString();

    const updatedStudents = students.map((currentStudent) =>
      currentStudent.id === studentId ? student : currentStudent
    );
    const updatedClasses = this.recalculateClassCounts(
      classes,
      updatedStudents,
      [oldClassId, newClassId],
      student.updatedAt
    );
    this.persistAtomically([
      { key: KEY_CLASSES, value: updatedClasses },
      { key: KEY_STUDENTS, value: updatedStudents },
    ]);

    this.logActivity(
      actor,
      "TRANSFER_STUDENT",
      "student",
      `Chuyển học sinh [${student.fullName}] từ lớp ${oldClassName} sang lớp ${newClass.name}`
    );

    return { success: true };
  }

  updateStudent(...args: Parameters<AdminService["updateStudentUnlocked"]>): Promise<ReturnType<AdminService["updateStudentUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.updateStudentUnlocked(...args));
  }

  private updateStudentUnlocked(
    actor: UserAccount,
    studentId: string,
    updates: Partial<Pick<Student, "fullName" | "studentCode" | "gender" | "birthDate" | "parentPhone" | "status">>
  ): { success: boolean; student?: Student; error?: string } {
    this.assertPermission(actor, "manage_students");

    const students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) return { success: false, error: "Không tìm thấy học sinh." };

    if (updates.studentCode && updates.studentCode.trim().toUpperCase() !== student.studentCode) {
      const cleanCode = updates.studentCode.trim().toUpperCase();
      const duplicate = students.some(
        (s) => s.id !== studentId && s.studentCode.trim().toUpperCase() === cleanCode
      );
      if (duplicate) {
        return { success: false, error: `Mã học sinh "${cleanCode}" đã trùng với một học sinh khác!` };
      }
      student.studentCode = cleanCode;
    }

    const previousStatus = student.status;
    if (updates.fullName !== undefined) student.fullName = updates.fullName.trim();
    if (updates.gender !== undefined) student.gender = updates.gender;
    if (updates.birthDate !== undefined) student.birthDate = updates.birthDate;
    if (updates.parentPhone !== undefined) student.parentPhone = updates.parentPhone.trim();
    if (updates.status !== undefined) student.status = updates.status;

    student.updatedAt = new Date().toISOString();
    student.updatedBy = actor.fullName;

    const updatedStudents = students.map((currentStudent) =>
      currentStudent.id === studentId ? student : currentStudent
    );
    if (updates.status !== undefined && updates.status !== previousStatus) {
      const classes = this.getClasses();
      const targetClass = classes.find((schoolClass) => schoolClass.id === student.classId);
      if (!targetClass) {
        return { success: false, error: "Không tìm thấy lớp liên kết để cập nhật sĩ số." };
      }
      const updatedClasses = this.recalculateClassCounts(
        classes,
        updatedStudents,
        [targetClass.id],
        student.updatedAt
      );
      this.persistAtomically([
        { key: KEY_CLASSES, value: updatedClasses },
        { key: KEY_STUDENTS, value: updatedStudents },
      ]);
    } else {
      this.setStorage(KEY_STUDENTS, updatedStudents);
    }

    this.logActivity(
      actor,
      "UPDATE_STUDENT",
      "student",
      `Cập nhật thông tin học sinh [${student.fullName} - ${student.studentCode}]`,
      student.id
    );

    return { success: true, student };
  }

  toggleStudentLock(...args: Parameters<AdminService["toggleStudentLockUnlocked"]>): Promise<ReturnType<AdminService["toggleStudentLockUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.toggleStudentLockUnlocked(...args));
  }

  private toggleStudentLockUnlocked(
    actor: UserAccount,
    studentId: string
  ): { success: boolean; newStatus?: "studying" | "locked"; error?: string } {
    this.assertPermission(actor, "manage_students");

    const students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) return { success: false, error: "Không tìm thấy học sinh." };

    const newStatus: "studying" | "locked" = student.status === "locked" ? "studying" : "locked";
    student.status = newStatus;
    student.updatedAt = new Date().toISOString();
    student.updatedBy = actor.fullName;

    this.setStorage(
      KEY_STUDENTS,
      students.map((s) => (s.id === studentId ? student : s))
    );

    this.logActivity(
      actor,
      newStatus === "locked" ? "LOCK_STUDENT" : "UNLOCK_STUDENT",
      "student",
      `${newStatus === "locked" ? "Khóa tài khoản" : "Mở khóa tài khoản"} học sinh [${student.fullName} - ${student.studentCode}]`,
      student.id
    );

    return { success: true, newStatus };
  }

  deleteStudent(...args: Parameters<AdminService["deleteStudentUnlocked"]>): Promise<ReturnType<AdminService["deleteStudentUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.deleteStudentUnlocked(...args));
  }

  private deleteStudentUnlocked(
    actor: UserAccount,
    studentId: string
  ): { success: boolean; error?: string } {
    this.assertPermission(actor, "manage_students");

    const students = this.getStudents();
    const student = students.find((s) => s.id === studentId);
    if (!student) return { success: false, error: "Không tìm thấy học sinh." };

    const classes = this.getClasses();
    const targetClass = classes.find((schoolClass) => schoolClass.id === student.classId);
    if (!targetClass) {
      return { success: false, error: "Không tìm thấy lớp liên kết để cập nhật sĩ số." };
    }
    const updated = students.filter((s) => s.id !== studentId);
    const updatedClasses = this.recalculateClassCounts(
      classes,
      updated,
      [targetClass.id],
      new Date().toISOString()
    );
    this.persistAtomically([
      { key: KEY_CLASSES, value: updatedClasses },
      { key: KEY_STUDENTS, value: updated },
    ]);

    this.logActivity(
      actor,
      "DELETE_STUDENT",
      "student",
      `Xóa hồ sơ học sinh [${student.fullName} - ${student.studentCode}] khỏi lớp ${student.className}`,
      studentId
    );

    return { success: true };
  }

  bulkImportStudents(...args: Parameters<AdminService["bulkImportStudentsUnlocked"]>): Promise<ReturnType<AdminService["bulkImportStudentsUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.bulkImportStudentsUnlocked(...args));
  }

  private bulkImportStudentsUnlocked(
    actor: UserAccount,
    incomingStudents: {
      studentCode: string;
      fullName: string;
      gender: "nam" | "nu";
      birthDate: string;
      gradeLevel: 6 | 7 | 8 | 9;
      classId: string;
      className: string;
      parentPhone?: string;
    }[]
  ): { success: boolean; count: number; error?: string } {
    this.assertPermission(actor, "manage_students");

    const currentStudents = this.getInternalStudents();
    const classes = this.getClasses();
    const now = new Date().toISOString();

    const classesById = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass]));
    const existingCodes = new Set(
      currentStudents.map((student) => student.studentCode.trim().toUpperCase())
    );
    const importedCodes = new Set<string>();
    const createdList: Student[] = [];

    for (const item of incomingStudents) {
      const cleanCode = item.studentCode.trim().toUpperCase();
      const targetClass = classesById.get(item.classId);
      if (!targetClass || !this.classHasValidGrade(targetClass)) {
        return { success: false, count: 0, error: "Tệp có lớp hoặc khối không hợp lệ." };
      }
      if (item.gradeLevel !== targetClass.gradeLevel || item.className !== targetClass.name) {
        return { success: false, count: 0, error: "Thông tin lớp trong tệp không khớp lớp đã chọn." };
      }
      if (existingCodes.has(cleanCode) || importedCodes.has(cleanCode)) {
        return { success: false, count: 0, error: "Tệp có mã học sinh trùng lặp." };
      }
      importedCodes.add(cleanCode);
      const newSt: Student = {
        id: "student-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        schoolId: targetClass.schoolId,
        studentCode: cleanCode,
        fullName: item.fullName.trim(),
        gender: item.gender,
        birthDate: item.birthDate,
        gradeLevel: targetClass.gradeLevel,
        classId: targetClass.id,
        className: targetClass.name,
        academicYear: targetClass.academicYear,
        parentPhone: item.parentPhone?.trim(),
        status: "studying",
        createdAt: now,
        updatedAt: now,
        createdBy: actor.fullName,
      };
      createdList.push(newSt);
    }

    const updatedStudents = [...currentStudents, ...createdList];
    const updatedClasses = this.recalculateClassCounts(
      classes,
      updatedStudents,
      [...new Set(createdList.map((student) => student.classId))],
      now
    );
    this.persistAtomically([
      { key: KEY_CLASSES, value: updatedClasses },
      { key: KEY_STUDENTS, value: updatedStudents },
    ]);

    this.logActivity(
      actor,
      "IMPORT_EXCEL_STUDENTS",
      "student",
      `Nhập thành công danh sách ${createdList.length} học sinh từ tệp Excel vào hệ thống`
    );

    return { success: true, count: createdList.length };
  }


  // Activity Logs
  getActivityLogs(actor?: UserAccount): ActivityLog[] {
    const activeActor = actor || this.getCurrentSessionUser();
    const storedActor = activeActor ? this.getSessionStoredUser(activeActor) : null;
    if (!storedActor) {
      return []; // Unauthenticated access blocked
    }
    if (storedActor.role !== "super_admin" && !this.hasPermission(storedActor, "view_reports")) {
      return []; // Blocked if not super admin or without view_reports permission
    }
    return this.getInternalActivityLogs();
  }

  private getInternalActivityLogs(): ActivityLog[] {
    let raw: string | null;
    try {
      raw = this.readRawStorage(KEY_LOGS);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Lỗi lưu trữ không xác định.";
      throw new Error(`Không thể đọc nhật ký hoạt động: ${reason}`);
    }
    if (raw === null) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Không thể đọc nhật ký hoạt động: dữ liệu JSON bị lỗi; dữ liệu gốc được giữ nguyên.");
    }
    if (!isActivityLogArray(parsed)) {
      throw new Error("Không thể đọc nhật ký hoạt động: cấu trúc dữ liệu không hợp lệ; dữ liệu gốc được giữ nguyên.");
    }
    return parsed;
  }

  private logActivity(
    actor: UserAccount,
    action: string,
    entity: "user" | "class" | "grade" | "teacher" | "student" | "system" | "permission",
    details: string,
    entityId?: string
  ): void {
    const logs = this.getInternalActivityLogs();
    const newLog = this.createActivityLog(actor, action, entity, details, entityId);
    // keep latest 500 logs
    const updated = [newLog, ...logs].slice(0, 500);
    this.setStorage(KEY_LOGS, updated);
  }

  private createActivityLog(
    actor: UserAccount,
    action: string,
    entity: ActivityLog["entity"],
    details: string,
    entityId?: string
  ): ActivityLog {
    return {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      schoolId: DEFAULT_SCHOOL.id,
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action,
      entity,
      entityId,
      details,
    };
  }

  // System Stats
  getStats(): SystemStats {
    const grades = this.getGrades();
    const classes = this.getClasses();
    const students = this.getStudents();
    const teachers = this.getTeachers();
    const users = this.getUsers();

    // calculate total students from student list or class counters
    const countedStudents = students.filter(
      (student) => this.countsTowardClassSize(student.status)
    ).length;
    const calculatedStudents = Math.max(
      countedStudents,
      classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)
    );

    return {
      totalGrades: grades.length,
      totalClasses: classes.length,
      totalStudents: calculatedStudents,
      totalTeachers: teachers.length,
      totalSubAdmins: users.filter((u) => u.role === "admin").length,
      activeClasses: classes.filter((c) => c.status === "active").length,
    };
  }

  // Backup & Restore
  exportBackup(actor: UserAccount, password: string): Promise<string> {
    return withLocalStorageWriteLock(() => this.exportBackupUnlocked(actor, password));
  }

  private async exportBackupUnlocked(actor: UserAccount, password: string): Promise<string> {
    const verifiedActor = this.assertSuperAdmin(actor);
    if (password.length < 12) throw new Error("Mật khẩu backup phải có ít nhất 12 ký tự.");
    const data = {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      notice: "Backup được mã hóa. Tệp có thể chứa dữ liệu cá nhân học sinh, giáo viên và mã truy cập lớp. Không chia sẻ mật khẩu. Tài khoản, passwordHash và salt không được sao lưu.",
      school: this.readBackupValue(KEY_SCHOOL, DEFAULT_SCHOOL),
      grades: this.readBackupValue(KEY_GRADES, DEFAULT_GRADES),
      classes: this.readBackupValue(KEY_CLASSES, DEFAULT_CLASSES),
      teachers: this.readBackupValue(KEY_TEACHERS, DEFAULT_TEACHERS),
      students: this.readBackupValue<Student[]>(KEY_STUDENTS, []),
      logs: this.readBackupValue<ActivityLog[]>(KEY_LOGS, []),
      content: {
        questions: contentService.getQuestions(verifiedActor),
        posts: contentService.getPosts(verifiedActor),
        videos: contentService.getVideos(verifiedActor),
        albums: contentService.getAlbums(),
        images: contentService.getImages(verifiedActor),
      },
      studentRecords: {
        quizRecords: this.readBackupValue<unknown[]>(KEY_STUDENT_QUIZ_RECORDS, []),
        pledges: this.readBackupValue<unknown[]>(KEY_STUDENT_PLEDGES, []),
      },
      competitions: this.readCompetitionBackupValue(),
      exportedAt: new Date().toISOString(),
      exportedBy: verifiedActor.fullName,
    };
    const encryptedBackup = await encryptBackupPayload(data, password);
    this.logActivity(verifiedActor, "BACKUP_DATA", "system", "Xuất sao lưu dữ liệu trường không bao gồm tài khoản.");
    return encryptedBackup;
  }

  async restoreBackup(
    actor: UserAccount,
    jsonStr: string,
    password: string
  ): Promise<{ success: boolean; message: string }> {
    const verifiedActor = this.assertSuperAdmin(actor);
    try {
      const parsed = await decryptBackupPayload(jsonStr, password);
      if (!isRecord(parsed) || parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
        return { success: false, message: `Phiên bản hoặc cấu trúc sao lưu không được hỗ trợ (yêu cầu schemaVersion ${BACKUP_SCHEMA_VERSION}). Không có dữ liệu nào được ghi.` };
      }
      const data = parsed;
      const school = data.school;
      const content = data.content;
      const studentRecords = data.studentRecords;

      if (
        !hasStringFields(school, ["id", "name", "code", "province", "district", "academicYear", "createdAt", "updatedAt", "status"]) ||
        !isRecordArray(data.grades, ["id", "name", "academicYear"]) ||
        !isRecordArray(data.classes, ["id", "gradeId", "name", "academicYear"]) ||
        !isRecordArray(data.teachers, ["id", "fullName", "email"]) ||
        !isRecordArray(data.students, ["id", "studentCode", "fullName", "classId"]) ||
        !isActivityLogArray(data.logs) ||
        !isRecord(content) ||
        !isRecordArray(content.questions, ["id"]) ||
        !isRecordArray(content.posts, ["id"]) ||
        !isRecordArray(content.videos, ["id"]) ||
        !isRecordArray(content.albums, ["id"]) ||
        !isRecordArray(content.images, ["id"]) ||
        !isRecord(studentRecords) ||
        !isRecordArray(studentRecords.quizRecords, ["id"]) ||
        !Array.isArray(studentRecords.pledges) ||
        !studentRecords.pledges.every(isRecord)
      ) {
        return { success: false, message: "Dữ liệu sao lưu không đúng cấu trúc. Không có dữ liệu nào được ghi." };
      }

      const hasCompetitionSection = Object.prototype.hasOwnProperty.call(data, "competitions");
      if (hasCompetitionSection && !isCompetitionData(data.competitions)) {
        return { success: false, message: "Dữ liệu cuộc thi trong bản sao lưu không hợp lệ. Không có dữ liệu nào được ghi." };
      }

      const hasAccountSection = Object.prototype.hasOwnProperty.call(data, "users");
      const invalidAccountSection = hasAccountSection && (
        !isRecordArray(data.users, ["id", "email", "fullName", "role", "status"]) ||
        data.users.some((user) =>
          hasProtectedCredentials(user) ||
          typeof user.passwordHash !== "string" ||
          typeof user.salt !== "string"
        )
      );
      const restoredLogs = data.logs;
      const restoreLog: ActivityLog = {
        id: "log-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        schoolId: verifiedActor.schoolId,
        timestamp: new Date().toISOString(),
        actorId: verifiedActor.id,
        actorName: verifiedActor.fullName,
        actorRole: verifiedActor.role,
        action: "RESTORE_DATA",
        entity: "system",
        details: "Phục hồi dữ liệu trường từ bản sao lưu; tài khoản không được phục hồi.",
      };

      const restoreEntries: Array<{ key: string; value?: unknown; remove?: boolean }> = [
        { key: KEY_SCHOOL, value: school },
        { key: KEY_GRADES, value: data.grades },
        { key: KEY_CLASSES, value: data.classes },
        { key: KEY_TEACHERS, value: data.teachers },
        { key: KEY_STUDENTS, value: data.students },
        { key: KEY_LOGS, value: [restoreLog, ...restoredLogs].slice(0, 500) },
        { key: KEY_CONTENT_QUESTIONS, value: content.questions },
        { key: KEY_CONTENT_POSTS, value: content.posts },
        { key: KEY_CONTENT_VIDEOS, value: content.videos },
        { key: KEY_CONTENT_ALBUMS, value: content.albums },
        { key: KEY_CONTENT_IMAGES, value: content.images },
        { key: KEY_STUDENT_QUIZ_RECORDS, value: studentRecords.quizRecords },
        { key: KEY_STUDENT_PLEDGES, value: studentRecords.pledges },
      ];
      if (hasCompetitionSection) {
        restoreEntries.push({ key: COMPETITION_STORAGE_KEY, value: data.competitions });
      }
      const updates = restoreEntries.map(({ key, value, remove }) => {
        if (remove) return { key, value: null };
        const serialized = JSON.stringify(value);
        if (typeof serialized !== "string") {
          throw new Error(`${this.getStorageGroup(key)}: dữ liệu không thể chuyển thành JSON.`);
        }
        return { key, value: serialized };
      });
      const storage: StoragePort = {
        getItem: (key) => this.readRawStorage(key),
        setItem: (key, value) => {
          if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
            window.localStorage.setItem(key, value);
          } else {
            this.memoryStorage[key] = value;
          }
        },
        removeItem: (key) => {
          if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
            window.localStorage.removeItem(key);
          } else {
            delete this.memoryStorage[key];
          }
        },
      };
      await applyStorageStageAtomically(storage, updates, password);

      const accountMessage = hasAccountSection
        ? invalidAccountSection
          ? " Phần tài khoản không hợp lệ (có thể chứa [PROTECTED]) đã bị từ chối; tài khoản hiện tại được giữ nguyên."
          : " Phần tài khoản được bỏ qua; tài khoản hiện tại được giữ nguyên."
        : " Tài khoản không nằm trong bản sao lưu và được giữ nguyên.";
      return { success: true, message: `Phục hồi dữ liệu trường thành công.${accountMessage}` };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Lỗi xử lý không xác định.";
      return { success: false, message: `Không thể hoàn tất phục hồi dữ liệu: ${reason}` };
    }
  }

  private readCompetitionBackupValue(): unknown {
    const raw = this.readRawStorage(COMPETITION_STORAGE_KEY);
    if (raw === null) {
      return { schemaVersion: 1, competitions: [], contestants: [], submissions: [] };
    }
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Dữ liệu cuộc thi không thể sao lưu vì JSON không hợp lệ: ${error instanceof Error ? error.message : "lỗi không xác định"}`);
    }
    if (!isCompetitionData(value)) {
      throw new Error("Dữ liệu cuộc thi không thể sao lưu vì cấu trúc không hợp lệ.");
    }
    return value;
  }

  async recoverAccountPassword(
    actor: UserAccount,
    targetUserId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; message: string }> {
    void currentPassword;
    void newPassword;
    void confirmPassword;
    this.assertSuperAdmin(actor);
    if (!targetUserId) {
      return { success: false, message: "Cần xác định tài khoản đích." };
    }
    return {
      success: false,
      message: "Từ chối phục hồi: ứng dụng không có cơ chế tin cậy để xác minh quyền sở hữu tài khoản đích. Không thay đổi dữ liệu.",
    };
  }

  // Guard helpers
  hasPermission(user: UserAccount | null | undefined, permission: AdminPermission): boolean {
    if (!user || user.status === "locked") return false;
    if (user.role === "super_admin") return true;
    if (user.role === "admin") {
      return user.permissions.includes(permission);
    }
    return false;
  }

  private assertSuperAdmin(user: UserAccount): UserAccount {
    const storedUser = this.getSessionStoredUser(user);
    if (
      !storedUser ||
      storedUser.role !== "super_admin" ||
      storedUser.status !== "active"
    ) {
      throw new Error("LỖI BẢO MẬT: Thao tác này chỉ dành riêng cho Admin chính của nhà trường!");
    }
    return storedUser;
  }

  private assertPermission(user: UserAccount, permission: AdminPermission): void {
    const storedUser = this.getSessionStoredUser(user);
    if (!storedUser || !this.hasPermission(storedUser, permission)) {
      throw new Error(`LỖI BẢO MẬT: Bạn không có quyền "${permission}" để thực hiện hành động này!`);
    }
  }
}

export const adminService = new AdminService();
