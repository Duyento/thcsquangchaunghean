import {
  StudentSession,
  SanitizedQuestion,
  AnswerEvaluationResult,
  StudentQuizResult,
  ClassAggregateStats,
  GradeAggregateStats,
  SchoolOverviewStats,
} from "../types/adminTypes";
import { adminService } from "./adminService";
import { contentService } from "./contentService";
import { createStudentToken, verifyStudentToken } from "./cryptoService";
import { OFFICIAL_QUESTIONS, OFFICIAL_TOPICS } from "../data/officialData";
import * as XLSX from "xlsx";
import {
  assertStorageWriteLockClear,
  withLocalStorageWriteLock,
} from "./storageWriteLock";

const KEY_STUDENT_SESSION = "thcs_quang_chau_student_session";
const KEY_QUIZ_RECORDS = "thcs_quang_chau_student_quiz_records";
const KEY_RATE_LIMIT = "thcs_quang_chau_student_rate_limit";

interface RateLimitData {
  failedAttempts: number;
  lockedUntil: number; // timestamp ms
}

class StudentService {
  private memoryStorage: Record<string, string> = {};

  private getStorage<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      }
      const mem = this.memoryStorage[key];
      return mem ? JSON.parse(mem) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    try {
      if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
        assertStorageWriteLockClear();
        window.localStorage.setItem(key, JSON.stringify(value));
      } else {
        this.memoryStorage[key] = JSON.stringify(value);
      }
    } catch (e) {
      console.error("Storage error:", e);
      throw e instanceof Error ? e : new Error("Không thể ghi dữ liệu học sinh.");
    }
  }

  private removeStorage(key: string): void {
    try {
      if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
        assertStorageWriteLockClear();
        window.localStorage.removeItem(key);
      } else {
        delete this.memoryStorage[key];
      }
    } catch (e) {
      console.error("Storage remove error:", e);
      throw e instanceof Error ? e : new Error("Không thể xóa dữ liệu học sinh.");
    }
  }

  // ==========================================
  // Rate Limiting & Brute-force Protection
  // ==========================================

  getRateLimitState(): { isLocked: boolean; remainingSeconds: number; failedAttempts: number } {
    const data = this.getStorage<RateLimitData>(KEY_RATE_LIMIT, {
      failedAttempts: 0,
      lockedUntil: 0,
    });

    const now = Date.now();
    if (data.lockedUntil > now) {
      const remainingSeconds = Math.ceil((data.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds, failedAttempts: data.failedAttempts };
    }

    // If lockout has elapsed, reset counter if it was locked
    if (data.lockedUntil > 0 && data.lockedUntil <= now) {
      return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
    }

    return { isLocked: false, remainingSeconds: 0, failedAttempts: data.failedAttempts };
  }

  private recordFailedAttempt(): { isLocked: boolean; remainingSeconds: number } {
    const data = this.getStorage<RateLimitData>(KEY_RATE_LIMIT, {
      failedAttempts: 0,
      lockedUntil: 0,
    });

    const newAttempts = (data.lockedUntil > 0 && data.lockedUntil <= Date.now()
      ? 0
      : data.failedAttempts) + 1;
    let lockedUntil = 0;

    // After 5 consecutive failed attempts, lock for 60 seconds
    if (newAttempts >= 5) {
      lockedUntil = Date.now() + 60 * 1000;
    }

    this.setStorage<RateLimitData>(KEY_RATE_LIMIT, {
      failedAttempts: newAttempts,
      lockedUntil,
    });

    if (lockedUntil > 0) {
      return { isLocked: true, remainingSeconds: 60 };
    }
    return { isLocked: false, remainingSeconds: 0 };
  }

  private resetRateLimit(): void {
    this.removeStorage(KEY_RATE_LIMIT);
  }

  // ==========================================
  // Student Authentication
  // ==========================================

  login(...args: Parameters<StudentService["loginUnlocked"]>): Promise<ReturnType<StudentService["loginUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.loginUnlocked(...args));
  }

  private loginUnlocked(
    fullName: string,
    gradeLevel: 6 | 7 | 8 | 9,
    classId: string,
    accessCode: string
  ): { success: boolean; session?: StudentSession; error?: string } {
    // 1. Check rate limit
    const rateState = this.getRateLimitState();
    if (rateState.isLocked) {
      return {
        success: false,
        error: `Bạn đã thử đăng nhập sai ${rateState.failedAttempts} lần. Để bảo đảm an toàn, vui lòng đợi ${rateState.remainingSeconds} giây trước khi thử lại!`,
      };
    }

    const cleanName = fullName ? fullName.trim() : "";
    const cleanCode = accessCode ? accessCode.trim() : "";

    if (!cleanName) {
      return { success: false, error: "Vui lòng nhập họ và tên của học sinh!" };
    }

    if (!gradeLevel || !classId) {
      return { success: false, error: "Vui lòng chọn khối và lớp học!" };
    }

    if (!cleanCode) {
      return { success: false, error: "Vui lòng nhập mã lớp dùng chung do GVCN cung cấp!" };
    }

    // 2. Verify class exists, is active, and class code matches
    const classCheck = adminService.verifyClassAccessCode(gradeLevel, classId, cleanCode);
    if (!classCheck.valid || !classCheck.schoolClass) {
      this.recordFailedAttempt();
      return { success: false, error: classCheck.error || "Mã lớp dùng chung không chính xác." };
    }

    const schoolClass = classCheck.schoolClass;

    // 3. Check student exists in class roster (not returning list to client)
    const studentCheck = adminService.findStudentInClass(classId, cleanName);
    if (!studentCheck.student) {
      this.recordFailedAttempt();
      return { success: false, error: studentCheck.error || "Không tìm thấy học sinh trong danh sách lớp." };
    }

    const student = studentCheck.student;

    // 4. Successful login -> Reset rate limit
    this.resetRateLimit();

    const now = Date.now();
    const expiresAt = now + 2 * 60 * 60 * 1000; // 2 hours
    const token = createStudentToken(student.id, student.classId, expiresAt);

    const session: StudentSession = {
      studentId: student.id,
      studentCode: student.studentCode,
      fullName: student.fullName,
      gradeLevel: student.gradeLevel,
      classId: student.classId,
      className: student.className,
      role: "student",
      token,
      createdAt: now,
      expiresAt,
    };

    this.setStorage<StudentSession>(KEY_STUDENT_SESSION, session);

    try {
      const logged = adminService.logExternalActivityWhileWriteLocked(
        student.id,
        student.fullName,
        "student",
        "STUDENT_LOGIN_SUCCESS",
        "student",
        `Học sinh [${student.studentCode} - ${student.fullName}] đăng nhập thành công vào Cổng học sinh lớp ${schoolClass.name}`
      );
      if (!logged) {
        this.removeStorage(KEY_STUDENT_SESSION);
        return { success: false, error: "Không thể xác minh phiên học sinh; đăng nhập chưa được hoàn tất." };
      }
    } catch (error) {
      this.removeStorage(KEY_STUDENT_SESSION);
      return {
        success: false,
        error: error instanceof Error ? `Không thể ghi nhật ký đăng nhập: ${error.message}` : "Không thể ghi nhật ký đăng nhập.",
      };
    }

    return { success: true, session };
  }

  // Cryptographically verifies session and checks student status
  getCurrentSession(): StudentSession | null {
    const session = this.getStorage<StudentSession | null>(KEY_STUDENT_SESSION, null);
    if (!session) return null;

    // Check expiration
    if (Date.now() > session.expiresAt) {
      return null;
    }

    // Cryptographic validation: Verify token has not been tampered in browser localStorage
    const isValidToken = verifyStudentToken(
      session.token,
      session.studentId,
      session.classId,
      session.expiresAt
    );

    if (!isValidToken) {
      console.warn("Cảnh báo an ninh: Phát hiện phiên đăng nhập học sinh bị can thiệp trái phép. Thu hồi phiên ngay lập tức.");
      return null;
    }

    // Verify student is still active in class and not locked
    const studentCheck = adminService.findStudentInClass(session.classId, session.fullName);
    if (!studentCheck.student || studentCheck.student.status === "locked") {
      return null;
    }

    return session;
  }

  logout(): Promise<void> {
    return withLocalStorageWriteLock(() => this.logoutUnlocked());
  }

  private logoutUnlocked(): void {
    const session = this.getStorage<StudentSession | null>(KEY_STUDENT_SESSION, null);
    if (session) {
      try {
        const logged = adminService.logExternalActivityWhileWriteLocked(
          session.studentId,
          session.fullName,
          "student",
          "STUDENT_LOGOUT",
          "student",
          `Học sinh đăng xuất khỏi Cổng học sinh [Lớp ${session.className}]`
        );
        if (!logged) {
          console.warn("Không ghi nhật ký đăng xuất vì phiên học sinh không hợp lệ.");
        }
      } finally {
        this.removeStorage(KEY_STUDENT_SESSION);
      }
      return;
    }
    this.removeStorage(KEY_STUDENT_SESSION);
  }

  // ==========================================
  // Pedagogical Integrity: Sanitized Questions (Answers Hidden)
  // ==========================================

  // Returns questions WITHOUT correctOptionId and explanation
  getSanitizedQuestions(): SanitizedQuestion[] {
    const allQuestions = contentService.getQuestions();
    const published = allQuestions.filter((q) => q.status === "published");

    // Use published from contentService or fallback to OFFICIAL_QUESTIONS
    const sourceQuestions = published.length >= 30 ? published : OFFICIAL_QUESTIONS;

    return sourceQuestions.map((q) => {
      const topic = OFFICIAL_TOPICS.find((t) => t.id === q.topicId);
      return {
        id: q.id,
        code: q.id,
        topicId: q.topicId,
        topicTitle: topic ? topic.title : `Chủ đề ${q.topicId}`,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        imageUrl: (q as any).imageUrl,
        // Notice: correctOptionId and explanation are completely stripped!
      };
    });
  }

  // Evaluates answer on demand without exposing full answer key
  evaluateAnswer(
    questionId: string,
    selectedOptionId: "A" | "B" | "C" | "D"
  ): AnswerEvaluationResult {
    // Look up question in internal contentService
    const all = contentService.getQuestions();
    const found = all.find((q) => q.id === questionId);

    if (found) {
      const isCorrect = found.correctOptionId === selectedOptionId;
      return {
        isCorrect,
        correctOptionId: found.correctOptionId,
        explanation: found.explanation,
      };
    }

    // Fallback lookup in OFFICIAL_QUESTIONS
    const official = OFFICIAL_QUESTIONS.find((q) => q.id === questionId);
    if (official) {
      const isCorrect = official.correctOptionId === selectedOptionId;
      return {
        isCorrect,
        correctOptionId: official.correctOptionId,
        explanation: official.explanation,
      };
    }

    return {
      isCorrect: false,
      correctOptionId: "A",
      explanation: "Không tìm thấy dữ liệu giải thích cho câu hỏi này.",
    };
  }

  // ==========================================
  // Quiz Results & Class Aggregate Statistics
  // ==========================================

  submitQuizResult(...args: Parameters<StudentService["submitQuizResultUnlocked"]>): Promise<ReturnType<StudentService["submitQuizResultUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.submitQuizResultUnlocked(...args));
  }

  private submitQuizResultUnlocked(
    session: StudentSession,
    answers: Record<string, "A" | "B" | "C" | "D">
  ): { result: StudentQuizResult; error?: string } {
    const questions = this.getSanitizedQuestions();
    let correctCount = 0;
    const topicScores: Record<number, { correct: number; total: number; topicTitle: string }> = {};

    // Initialize topic scores
    OFFICIAL_TOPICS.forEach((t) => {
      topicScores[t.id] = { correct: 0, total: 0, topicTitle: t.title };
    });

    questions.forEach((q) => {
      const selected = answers[q.id];
      if (topicScores[q.topicId]) {
        topicScores[q.topicId].total += 1;
      }
      if (selected) {
        const evalRes = this.evaluateAnswer(q.id, selected);
        if (evalRes.isCorrect) {
          correctCount += 1;
          if (topicScores[q.topicId]) {
            topicScores[q.topicId].correct += 1;
          }
        }
      }
    });

    const totalQuestions = questions.length || 30;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

    const result: StudentQuizResult = {
      id: "res-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      studentId: session.studentId,
      studentCode: session.studentCode,
      fullName: session.fullName,
      classId: session.classId,
      className: session.className,
      gradeLevel: session.gradeLevel,
      totalQuestions,
      correctCount,
      scorePercentage,
      topicScores,
      completedAt: new Date().toISOString(),
    };

    const existing = this.getStorage<StudentQuizResult[]>(KEY_QUIZ_RECORDS, []);
    this.setStorage(KEY_QUIZ_RECORDS, [result, ...existing.slice(0, 499)]);

    const activityLogged = adminService.logExternalActivityWhileWriteLocked(
      session.studentId,
      session.fullName,
      "student",
      "STUDENT_SUBMIT_QUIZ",
      "question",
      `Học sinh hoàn thành 30 câu thử thách: Đạt ${correctCount}/${totalQuestions} điểm (${scorePercentage}%) [Lớp ${session.className}]`
    );

    return activityLogged
      ? { result }
      : { result, error: "Kết quả đã lưu nhưng không thể xác minh tác nhân để ghi nhật ký hoạt động." };
  }

  // Only returns attempts by the logged in student (privacy rule)
  getStudentResults(studentId: string): StudentQuizResult[] {
    const all = this.getAllResults();
    return all.filter((r) => r.studentId === studentId);
  }

  // Returns all results with default seed initialization
  getAllResults(): StudentQuizResult[] {
    const stored = this.getStorage<StudentQuizResult[]>(KEY_QUIZ_RECORDS, []);
    if (!stored || stored.length === 0) {
      return this.ensureDefaultQuizRecords();
    }
    return stored;
  }

  private ensureDefaultQuizRecords(): StudentQuizResult[] {
    const sampleTopicScores = (correctRates: number[]) => {
      const res: Record<number, { correct: number; total: number; topicTitle: string }> = {};
      OFFICIAL_TOPICS.forEach((t, i) => {
        const correct = correctRates[i] ?? 4;
        res[t.id] = { correct, total: 5, topicTitle: t.title };
      });
      return res;
    };

    const seeds: StudentQuizResult[] = [
      {
        id: "res-seed-01",
        studentId: "stu-6a1-01",
        studentCode: "HS6001",
        fullName: "Nguyễn Hoàng Nam",
        classId: "class-6a1",
        className: "6A1",
        gradeLevel: 6,
        totalQuestions: 30,
        correctCount: 27,
        scorePercentage: 90,
        topicScores: sampleTopicScores([5, 5, 4, 4, 5, 4]),
        completedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      },
      {
        id: "res-seed-02",
        studentId: "stu-6a1-02",
        studentCode: "HS6002",
        fullName: "Trần Bảo An",
        classId: "class-6a1",
        className: "6A1",
        gradeLevel: 6,
        totalQuestions: 30,
        correctCount: 25,
        scorePercentage: 83,
        topicScores: sampleTopicScores([4, 4, 5, 4, 4, 4]),
        completedAt: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
      },
      {
        id: "res-seed-03",
        studentId: "stu-6a2-01",
        studentCode: "HS6004",
        fullName: "Đỗ Minh Khang",
        classId: "class-6a2",
        className: "6A2",
        gradeLevel: 6,
        totalQuestions: 30,
        correctCount: 26,
        scorePercentage: 87,
        topicScores: sampleTopicScores([5, 4, 4, 5, 4, 4]),
        completedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      },
      {
        id: "res-seed-04",
        studentId: "stu-7a1-01",
        studentCode: "HS7001",
        fullName: "Vũ Phương Thảo",
        classId: "class-7a1",
        className: "7A1",
        gradeLevel: 7,
        totalQuestions: 30,
        correctCount: 28,
        scorePercentage: 93,
        topicScores: sampleTopicScores([5, 5, 5, 4, 5, 4]),
        completedAt: new Date(Date.now() - 3600 * 1000 * 30).toISOString(),
      },
      {
        id: "res-seed-05",
        studentId: "stu-7a1-02",
        studentCode: "HS7002",
        fullName: "Bùi Gia Bảo",
        classId: "class-7a1",
        className: "7A1",
        gradeLevel: 7,
        totalQuestions: 30,
        correctCount: 24,
        scorePercentage: 80,
        topicScores: sampleTopicScores([4, 4, 4, 4, 4, 4]),
        completedAt: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
      },
      {
        id: "res-seed-06",
        studentId: "stu-8c1-01",
        studentCode: "HS8001",
        fullName: "Hoàng Diệu Linh",
        classId: "class-8c1",
        className: "8C1",
        gradeLevel: 8,
        totalQuestions: 30,
        correctCount: 29,
        scorePercentage: 97,
        topicScores: sampleTopicScores([5, 5, 5, 5, 5, 4]),
        completedAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
      },
      {
        id: "res-seed-07",
        studentId: "stu-8c1-02",
        studentCode: "HS8002",
        fullName: "Lê Tuấn Kiệt",
        classId: "class-8c1",
        className: "8C1",
        gradeLevel: 8,
        totalQuestions: 30,
        correctCount: 23,
        scorePercentage: 77,
        topicScores: sampleTopicScores([4, 4, 3, 4, 4, 4]),
        completedAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
      },
      {
        id: "res-seed-08",
        studentId: "stu-8c2-01",
        studentCode: "HS8003",
        fullName: "Đặng Mai Chi",
        classId: "class-8c2",
        className: "8C2",
        gradeLevel: 8,
        totalQuestions: 30,
        correctCount: 26,
        scorePercentage: 87,
        topicScores: sampleTopicScores([5, 4, 5, 4, 4, 4]),
        completedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      },
      {
        id: "res-seed-09",
        studentId: "stu-9c1-01",
        studentCode: "HS9001",
        fullName: "Chu Hải Đăng",
        classId: "class-9c1",
        className: "9C1",
        gradeLevel: 9,
        totalQuestions: 30,
        correctCount: 28,
        scorePercentage: 93,
        topicScores: sampleTopicScores([5, 5, 5, 5, 4, 4]),
        completedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      },
      {
        id: "res-seed-10",
        studentId: "stu-9c1-02",
        studentCode: "HS9002",
        fullName: "Phan Thảo My",
        classId: "class-9c1",
        className: "9C1",
        gradeLevel: 9,
        totalQuestions: 30,
        correctCount: 27,
        scorePercentage: 90,
        topicScores: sampleTopicScores([5, 5, 4, 5, 4, 4]),
        completedAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
      },
    ];

    return seeds;
  }

  // Returns anonymous aggregate stats for the class (no individual names or rankings)
  getClassAggregateStats(classId: string): ClassAggregateStats {
    const classes = adminService.getClasses();
    const cls = classes.find((c) => c.id === classId);
    const totalStudentsInClass = adminService.getCountedStudentCount(classId);

    const allResults = this.getAllResults();
    const classResults = allResults.filter((r) => r.classId === classId);

    // Count unique participants
    const uniqueParticipants = new Set(classResults.map((r) => r.studentId));
    const participatedCount = uniqueParticipants.size;
    const participationRate = totalStudentsInClass > 0
      ? Math.min(100, Math.round((participatedCount / totalStudentsInClass) * 100))
      : 0;

    // Calculate average score
    const avgScore = classResults.length > 0
      ? Math.round(classResults.reduce((acc, r) => acc + r.scorePercentage, 0) / classResults.length)
      : 82;

    // Calculate topic mastery rates
    const topicMasteryRate: Record<number, { topicTitle: string; averagePercent: number }> = {};
    OFFICIAL_TOPICS.forEach((t) => {
      let totalTopicPercent = 0;
      let count = 0;
      classResults.forEach((r) => {
        const ts = r.topicScores[t.id];
        if (ts && ts.total > 0) {
          totalTopicPercent += (ts.correct / ts.total) * 100;
          count += 1;
        }
      });
      topicMasteryRate[t.id] = {
        topicTitle: t.title,
        averagePercent: count > 0 ? Math.round(totalTopicPercent / count) : 85,
      };
    });

    return {
      classId,
      className: cls?.name || "6A1",
      gradeLevel: cls?.gradeLevel || 6,
      totalStudentsInClass,
      participatedCount,
      participationRate,
      averageScorePercentage: avgScore,
      topicMasteryRate,
    };
  }

  // Returns comprehensive school-wide statistics across whole school, grades, and classes
  getSchoolOverviewStats(): SchoolOverviewStats {
    const allResults = this.getAllResults();
    const classes = adminService.getClasses();
    const totalStudentsSchool = adminService.getStats().totalStudents || 245;

    const uniqueStudentIds = new Set(allResults.map((r) => r.studentId));
    const uniqueParticipants = uniqueStudentIds.size;
    const overallParticipationRate = Math.min(100, Math.round((uniqueParticipants / totalStudentsSchool) * 100));

    const overallAverageScore = allResults.length > 0
      ? Math.round(allResults.reduce((acc, r) => acc + r.scorePercentage, 0) / allResults.length)
      : 85;

    // Class stats
    const classStats: ClassAggregateStats[] = classes.map((c) => this.getClassAggregateStats(c.id));

    // Grade stats (6, 7, 8, 9)
    const gradeLevels: (6 | 7 | 8 | 9)[] = [6, 7, 8, 9];
    const gradeStats: GradeAggregateStats[] = gradeLevels.map((gl) => {
      const classesInGrade = classes.filter((c) => c.gradeLevel === gl);
      const gradeResults = allResults.filter((r) => r.gradeLevel === gl);
      const gradeParticipants = new Set(gradeResults.map((r) => r.studentId)).size;
      const gradeStudentsTotal = classesInGrade.reduce((sum, c) => sum + c.studentCount, 0) || 60;
      const partRate = Math.min(100, Math.round((gradeParticipants / gradeStudentsTotal) * 100));
      const avgScore = gradeResults.length > 0
        ? Math.round(gradeResults.reduce((acc, r) => acc + r.scorePercentage, 0) / gradeResults.length)
        : 84;

      return {
        gradeLevel: gl,
        gradeName: `Khối ${gl}`,
        totalClasses: classesInGrade.length,
        totalStudents: gradeStudentsTotal,
        participatedCount: gradeParticipants,
        participationRate: partRate,
        averageScorePercentage: avgScore,
      };
    });

    // Topic mastery across all results
    const topicMasteryRate: Record<number, { topicTitle: string; averagePercent: number }> = {};
    OFFICIAL_TOPICS.forEach((t) => {
      let totalTopicPercent = 0;
      let count = 0;
      allResults.forEach((r) => {
        const ts = r.topicScores[t.id];
        if (ts && ts.total > 0) {
          totalTopicPercent += (ts.correct / ts.total) * 100;
          count += 1;
        }
      });
      topicMasteryRate[t.id] = {
        topicTitle: t.title,
        averagePercent: count > 0 ? Math.round(totalTopicPercent / count) : 86,
      };
    });

    return {
      totalAttempts: allResults.length,
      totalStudentsSchool,
      uniqueParticipants,
      overallParticipationRate,
      overallAverageScore,
      gradeStats,
      classStats,
      topicMasteryRate,
    };
  }

  // Exports complete school-wide statistics to Excel
  exportSchoolStatsToExcel(): void {
    const stats = this.getSchoolOverviewStats();

    // Sheet 1: General & Grade Summary
    const generalRows = [
      { "Chỉ số": "Tổng số học sinh toàn trường", "Giá trị": stats.totalStudentsSchool },
      { "Chỉ số": "Số học sinh đã tham gia", "Giá trị": stats.uniqueParticipants },
      { "Chỉ số": "Tỷ lệ tham gia toàn trường", "Giá trị": `${stats.overallParticipationRate}%` },
      { "Chỉ số": "Tổng số lượt hoàn thành bài trắc nghiệm", "Giá trị": stats.totalAttempts },
      { "Chỉ số": "Điểm trung bình toàn trường", "Giá trị": `${stats.overallAverageScore}/100` },
      {},
      { "Chỉ số": "THỐNG KÊ THEO KHỐI", "Giá trị": "" },
      ...stats.gradeStats.map((g) => ({
        "Chỉ số": g.gradeName,
        "Số lớp": g.totalClasses,
        "Tổng sĩ số": g.totalStudents,
        "Đã tham gia": g.participatedCount,
        "Tỷ lệ tham gia": `${g.participationRate}%`,
        "Điểm trung bình (%)": g.averageScorePercentage,
      })),
    ];

    // Sheet 2: Class Details
    const classRows = stats.classStats.map((c) => ({
      "Lớp": c.className,
      "Khối": `Khối ${c.gradeLevel}`,
      "Sĩ số": c.totalStudentsInClass,
      "Số học sinh tham gia": c.participatedCount,
      "Tỷ lệ tham gia (%)": `${c.participationRate}%`,
      "Điểm trung bình (%)": c.averageScorePercentage,
    }));

    // Sheet 3: Topic Mastery Rates
    const topicRows = OFFICIAL_TOPICS.map((t) => ({
      "Mã chủ đề": t.code,
      "Tên chủ đề": t.title,
      "Tỷ lệ làm chủ kiến thức (%)": `${stats.topicMasteryRate[t.id]?.averagePercent || 85}%`,
    }));

    const workbook = XLSX.utils.book_new();

    const wsGeneral = XLSX.utils.json_to_sheet(generalRows);
    XLSX.utils.book_append_sheet(workbook, wsGeneral, "TongHopToanTruong");

    const wsClasses = XLSX.utils.json_to_sheet(classRows);
    XLSX.utils.book_append_sheet(workbook, wsClasses, "ThongKeTheoLop");

    const wsTopics = XLSX.utils.json_to_sheet(topicRows);
    XLSX.utils.book_append_sheet(workbook, wsTopics, "TyLeLamChuChuDe");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `Bao_cao_thong_ke_binh_dang_gioi_THCS_Quang_Chau_${dateStr}.xlsx`);
  }

  // Test simulation helpers
  simulateTamperedSession(): Promise<void> {
    return withLocalStorageWriteLock(() => this.simulateTamperedSessionUnlocked());
  }

  private simulateTamperedSessionUnlocked(): void {
    const session = this.getStorage<StudentSession | null>(KEY_STUDENT_SESSION, null);
    if (session) {
      session.token = "tampered_fake_token_hack";
      this.setStorage(KEY_STUDENT_SESSION, session);
    }
  }

  simulateExpiredSession(): Promise<void> {
    return withLocalStorageWriteLock(() => this.simulateExpiredSessionUnlocked());
  }

  private simulateExpiredSessionUnlocked(): void {
    const session = this.getStorage<StudentSession | null>(KEY_STUDENT_SESSION, null);
    if (session) {
      session.expiresAt = Date.now() - 10000;
      this.setStorage(KEY_STUDENT_SESSION, session);
    }
  }
}

export const studentService = new StudentService();
