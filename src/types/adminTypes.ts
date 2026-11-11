/**
 * Type definitions for School Administration System (ĐỢT 1)
 * Trường THCS Quảng Châu - Nghệ An
 */

export type UserRole = "super_admin" | "admin" | "teacher" | "student";

export type AdminPermission =
  | "manage_classes"      // Quản lý lớp học
  | "manage_students"     // Quản lý học sinh
  | "manage_teachers"     // Quản lý giáo viên
  | "manage_questions"    // Quản lý câu hỏi
  | "manage_posts"        // Quản lý bài viết
  | "manage_videos"       // Quản lý video
  | "manage_images"       // Quản lý hình ảnh
  | "view_reports"        // Xem báo cáo
  | "manage_campaigns";   // Quản lý nội dung tuyên truyền

export interface School {
  id: string;
  name: string;
  code: string;
  province: string;
  district: string;
  academicYear: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "inactive";
}

export interface UserAccount {
  id: string;
  schoolId: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: "active" | "locked" | "pending";
  permissions: AdminPermission[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastLoginAt?: string;
  phone?: string;
}

export interface StoredUserAccount extends UserAccount {
  passwordHash: string;
  salt: string;
}

export interface Grade {
  id: string;
  schoolId: string;
  level: 6 | 7 | 8 | 9;
  name: string; // e.g. "Khối 6"
  academicYear: string;
  description: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  gradeId: string;
  gradeLevel: 6 | 7 | 8 | 9;
  name: string; // e.g. "6A1", "6A2", "7A1", "8C1", "9C2"
  academicYear: string;
  homeroomTeacherId?: string;
  homeroomTeacherName?: string;
  studentCount: number;
  status: "active" | "archived" | "locked";
  roomNumber?: string;
  accessCode?: string; // Mã lớp dùng chung cho học sinh (e.g. "QC6A1")
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Teacher {
  id: string;
  schoolId: string;
  userId?: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string; // e.g. "Toán", "Ngữ văn", "Khoa học tự nhiên", "GDCD"
  homeroomClassId?: string;
  homeroomClassName?: string;
  status: "active" | "on_leave" | "retired";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Student {
  id: string;
  schoolId: string;
  studentCode: string; // e.g. "HS-2026-001"
  fullName: string;
  gender: "nam" | "nu";
  birthDate: string;
  gradeLevel: 6 | 7 | 8 | 9;
  classId: string;
  className: string;
  academicYear: string;
  parentPhone?: string;
  status: "studying" | "transferred" | "graduated" | "locked";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export type ContentStatus = "draft" | "pending_approval" | "approved" | "published" | "archived";

export interface QuestionOptionItem {
  id: "A" | "B" | "C" | "D";
  text: string;
}

export interface ManageableQuestion {
  id: string; // e.g. "Q01", "Q-1738..."
  code: string;
  topicId: number; // 1 to 6
  topicTitle: string;
  difficulty: "Nhận biết" | "Thông hiểu" | "Vận dụng";
  question: string;
  options: QuestionOptionItem[];
  correctOptionId: "A" | "B" | "C" | "D";
  explanation: string;
  imageUrl?: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  isDefault?: boolean;
}

export interface ArticlePost {
  id: string;
  title: string;
  summary: string;
  content: string; // HTML formatted content
  coverImage: string;
  topicId: number;
  topicTitle: string;
  author: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  views: number;
}

export interface MediaVideoItem {
  id: string;
  title: string;
  description: string;
  topicId: number;
  topicTitle: string;
  videoUrl: string; // YouTube or direct video link
  youtubeId?: string;
  thumbnailUrl: string;
  presenter: string;
  duration?: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface ImageAlbum {
  id: string;
  name: string;
  description: string;
  topicId?: number;
  createdAt: string;
  createdBy: string;
}

export interface GalleryImageItem {
  id: string;
  albumId: string;
  albumName: string;
  title: string;
  caption: string;
  sourceCredit: string;
  topicId: number;
  topicTitle: string;
  imageUrl: string;
  format: "jpg" | "png" | "webp";
  fileSizeKb?: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface ActivityLog {
  id: string;
  schoolId: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entity: "user" | "class" | "grade" | "teacher" | "student" | "system" | "permission" | "question" | "post" | "video" | "image";
  entityId?: string;
  details: string;
  ipAddress?: string;
}

export interface SystemStats {
  totalGrades: number;
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
  totalSubAdmins: number;
  activeClasses: number;
  totalQuestions?: number;
  totalPosts?: number;
  totalVideos?: number;
  totalImages?: number;
  pendingApprovals?: number;
}

// ==========================================
// ĐỢT 3: CỔNG HỌC SINH & GIÁO VIÊN
// ==========================================

export interface StudentSession {
  studentId: string;
  studentCode: string;
  fullName: string;
  gradeLevel: 6 | 7 | 8 | 9;
  classId: string;
  className: string;
  role: "student";
  token: string;
  createdAt: number;
  expiresAt: number;
}

export interface SanitizedQuestion {
  id: string;
  code: string;
  topicId: number;
  topicTitle: string;
  difficulty: "Nhận biết" | "Thông hiểu" | "Vận dụng";
  question: string;
  options: QuestionOptionItem[];
  imageUrl?: string;
  // NOTE: correctOptionId and explanation are intentionally omitted before student answers!
}

export interface AnswerEvaluationResult {
  isCorrect: boolean;
  correctOptionId: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface StudentAnswerRecord {
  questionId: string;
  selectedOptionId: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  topicId: number;
}

export interface StudentQuizResult {
  id: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  classId: string;
  className: string;
  gradeLevel: 6 | 7 | 8 | 9;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  topicScores: Record<number, { correct: number; total: number; topicTitle: string }>;
  completedAt: string;
}

export interface ClassAggregateStats {
  classId: string;
  className: string;
  gradeLevel: 6 | 7 | 8 | 9;
  totalStudentsInClass: number;
  participatedCount: number;
  participationRate: number; // percentage 0-100
  averageScorePercentage: number;
  topicMasteryRate: Record<number, { topicTitle: string; averagePercent: number }>;
}

export interface GradeAggregateStats {
  gradeLevel: 6 | 7 | 8 | 9;
  gradeName: string;
  totalClasses: number;
  totalStudents: number;
  participatedCount: number;
  participationRate: number;
  averageScorePercentage: number;
}

export interface SchoolOverviewStats {
  totalAttempts: number;
  totalStudentsSchool: number;
  uniqueParticipants: number;
  overallParticipationRate: number;
  overallAverageScore: number;
  gradeStats: GradeAggregateStats[];
  classStats: ClassAggregateStats[];
  topicMasteryRate: Record<number, { topicTitle: string; averagePercent: number }>;
}
