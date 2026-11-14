import { adminService } from "./adminService";
import {
  Competition,
  CompetitionContestant,
  CompetitionData,
  CompetitionScoringMode,
  CompetitionSubmission,
  ContestantImportPreview,
  ContestantImportRow,
  COMPETITION_STORAGE_KEY,
  isCompetitionData,
  SubmissionStatus,
} from "../types/competitionTypes";
import { UserAccount } from "../types/adminTypes";
import * as XLSX from "xlsx";
import {
  assertStorageWriteLockClear,
  withLocalStorageWriteLock,
} from "./storageWriteLock";

const EMPTY_DATA: CompetitionData = {
  schemaVersion: 1,
  competitions: [],
  contestants: [],
  submissions: [],
};

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function readContestantExcel(file: Blob): Promise<ContestantImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (!(reader.result instanceof ArrayBuffer)) {
          throw new Error("Không đọc được nội dung Excel.");
        }
        const workbook = XLSX.read(reader.result, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error("Tệp Excel không có trang tính.");
        const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
          header: 1,
          raw: false,
          defval: "",
          blankrows: true,
        });
        const headers = rows[0]?.map((value) => String(value).trim()) ?? [];
        const nameIndex = headers.findIndex((header) => header === "Họ và tên" || header === "fullName");
        const classIndex = headers.findIndex((header) => header === "Lớp" || header === "className");
        const codeIndex = headers.findIndex((header) => header === "Mã học sinh" || header === "studentCode");
        if (nameIndex < 0) throw new Error("Tệp Excel thiếu cột bắt buộc “Họ và tên”.");
        const contestants = rows.slice(1).flatMap((row) => {
          const cells = Array.isArray(row) ? row : [];
          const nameValue = cells[nameIndex] ?? "";
          const classValue = classIndex < 0 ? "" : cells[classIndex] ?? "";
          const codeValue = codeIndex < 0 ? "" : cells[codeIndex] ?? "";
          if ([nameValue, classValue, codeValue].every((value) => String(value).trim() === "")) return [];
          const fullName = String(nameValue).trim();
          const className = String(classValue).trim();
          const studentCode = String(codeValue).trim();
          let invalidReason: string | undefined;
          if (!fullName) invalidReason = "Thiếu họ tên.";
          else if (fullName.length > 120) invalidReason = "Họ tên vượt quá 120 ký tự.";
          else if (className.length > 40) invalidReason = "Tên lớp vượt quá 40 ký tự.";
          else if (studentCode.length > 40 || (studentCode && !/^[\p{L}\d_-]+$/u.test(studentCode))) {
            invalidReason = "Mã học sinh sai định dạng.";
          }
          return [{
            fullName,
            className,
            ...(studentCode ? { studentCode } : {}),
            ...(invalidReason ? { invalidReason } : {}),
          }];
        });
        resolve(contestants);
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Không đọc được tệp Excel."));
      }
    };
    reader.onerror = () => reject(new Error("Không đọc được tệp Excel."));
    reader.readAsArrayBuffer(file);
  });
}

class CompetitionService {
  private requireSuperAdmin(actor: UserAccount): UserAccount {
    const verified = adminService.getSessionActor(actor);
    if (!verified || verified.role !== "super_admin" || verified.status !== "active") {
      throw new Error("Chỉ Super Admin đang có phiên hợp lệ mới được quản lý cuộc thi.");
    }
    return verified;
  }

  private readData(): CompetitionData {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") return EMPTY_DATA;
    const raw = window.localStorage.getItem(COMPETITION_STORAGE_KEY);
    if (raw === null) return EMPTY_DATA;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Dữ liệu cuộc thi không phải JSON hợp lệ: ${error instanceof Error ? error.message : "lỗi không xác định"}`);
    }
    if (!isCompetitionData(parsed)) {
      throw new Error("Dữ liệu cuộc thi không đúng cấu trúc; không có dữ liệu nào được ghi.");
    }
    return parsed;
  }

  private writeData(data: CompetitionData): void {
    if (!isCompetitionData(data)) {
      throw new Error("Dữ liệu cuộc thi không hợp lệ; không ghi dữ liệu.");
    }
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      throw new Error("Không có Local Storage để lưu dữ liệu cuộc thi.");
    }
    const serialized = JSON.stringify(data);
    let snapshot: string | null;
    try {
      snapshot = window.localStorage.getItem(COMPETITION_STORAGE_KEY);
    } catch (error) {
      throw new Error(`Không thể đọc snapshot dữ liệu cuộc thi trước khi ghi: ${error instanceof Error ? error.message : "lỗi đọc không xác định"}. Không có dữ liệu mới nào được ghi.`);
    }

    try {
      assertStorageWriteLockClear();
      window.localStorage.setItem(COMPETITION_STORAGE_KEY, serialized);
      if (window.localStorage.getItem(COMPETITION_STORAGE_KEY) !== serialized) {
        throw new Error("Dữ liệu đọc lại không khớp sau khi ghi.");
      }
      return;
    } catch (writeError) {
      const writeReason = writeError instanceof Error ? writeError.message : "lỗi lưu trữ không xác định";
      let rollbackError: unknown;
      try {
        assertStorageWriteLockClear();
        if (snapshot === null) window.localStorage.removeItem(COMPETITION_STORAGE_KEY);
        else window.localStorage.setItem(COMPETITION_STORAGE_KEY, snapshot);
      } catch (error) {
        rollbackError = error;
      }

      try {
        const restored = window.localStorage.getItem(COMPETITION_STORAGE_KEY);
        if (restored !== snapshot) {
          throw new Error("Giá trị sau rollback không khớp snapshot ban đầu.");
        }
      } catch (verifyError) {
        const rollbackReason = rollbackError instanceof Error
          ? rollbackError.message
          : verifyError instanceof Error
            ? verifyError.message
            : "không xác minh được rollback";
        throw new Error(`Không thể ghi dữ liệu cuộc thi (${writeReason}); rollback snapshot thất bại hoặc không xác minh được (${rollbackReason}). Trạng thái khóa cuộc thi chưa được xác nhận an toàn.`);
      }
      throw new Error(`Không thể ghi dữ liệu cuộc thi (${writeReason}); snapshot cũ đã được khôi phục và xác minh.`);
    }
  }

  getData(actor: UserAccount): CompetitionData {
    this.requireSuperAdmin(actor);
    const data = this.readData();
    let changed = false;
    data.competitions = data.competitions.map((competition) => {
      if (competition.status === "archived" || competition.closedAt) return competition;
      const status = this.statusForDates(competition.startsAt, competition.endsAt);
      if (status === competition.status) return competition;
      changed = true;
      return { ...competition, status, updatedAt: new Date().toISOString() };
    });
    void changed;
    return data;
  }

  createCompetition(...args: Parameters<CompetitionService["createCompetitionUnlocked"]>): Promise<ReturnType<CompetitionService["createCompetitionUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.createCompetitionUnlocked(...args));
  }

  private createCompetitionUnlocked(
    actor: UserAccount,
    input: Omit<Competition, "id" | "schoolId" | "createdAt" | "updatedAt" | "archivedAt" | "status">
  ): Competition {
    const verified = this.requireSuperAdmin(actor);
    this.validateCompetitionInput(input);
    const data = this.readData();
    const now = new Date().toISOString();
    const competition: Competition = {
      ...input,
      id: makeId("competition"),
      schoolId: verified.schoolId,
      status: this.statusForDates(input.startsAt, input.endsAt),
      createdAt: now,
      updatedAt: now,
    };
    data.competitions.push(competition);
    this.writeData(data);
    return competition;
  }

  updateCompetition(...args: Parameters<CompetitionService["updateCompetitionUnlocked"]>): Promise<ReturnType<CompetitionService["updateCompetitionUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.updateCompetitionUnlocked(...args));
  }

  private updateCompetitionUnlocked(actor: UserAccount, id: string, input: Omit<Competition, "id" | "schoolId" | "createdAt" | "updatedAt" | "archivedAt" | "status">): Competition {
    this.requireSuperAdmin(actor);
    this.validateCompetitionInput(input);
    const data = this.readData();
    const index = data.competitions.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Không tìm thấy cuộc thi.");
    const current = data.competitions[index];
    if (current.status === "archived") throw new Error("Cuộc thi đã lưu trữ, không thể chỉnh sửa.");
    const updated: Competition = {
      ...current,
      ...input,
      status: current.status === "ended" ? "ended" : this.statusForDates(input.startsAt, input.endsAt),
      updatedAt: new Date().toISOString(),
    };
    data.competitions[index] = updated;
    this.writeData(data);
    return updated;
  }

  closeCompetition(...args: Parameters<CompetitionService["closeCompetitionUnlocked"]>): Promise<ReturnType<CompetitionService["closeCompetitionUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.closeCompetitionUnlocked(...args));
  }

  private closeCompetitionUnlocked(actor: UserAccount, competitionId: string): Competition {
    return this.changeStatus(actor, competitionId, "ended");
  }

  archiveCompetition(...args: Parameters<CompetitionService["archiveCompetitionUnlocked"]>): Promise<ReturnType<CompetitionService["archiveCompetitionUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.archiveCompetitionUnlocked(...args));
  }

  private archiveCompetitionUnlocked(actor: UserAccount, competitionId: string, confirmed: boolean): Competition {
    this.requireSuperAdmin(actor);
    if (!confirmed) throw new Error("Cần xác nhận trước khi khóa kết quả và lưu trữ cuộc thi.");
    return this.changeStatus(actor, competitionId, "archived");
  }

  addContestant(...args: Parameters<CompetitionService["addContestantUnlocked"]>): Promise<ReturnType<CompetitionService["addContestantUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.addContestantUnlocked(...args));
  }

  private addContestantUnlocked(actor: UserAccount, competitionId: string, input: { fullName: string; className?: string; sourceStudentId?: string }): CompetitionContestant {
    this.requireSuperAdmin(actor);
    const data = this.readData();
    const competition = this.requireEditableCompetition(data, competitionId);
    const fullName = input.fullName.trim();
    const className = input.className?.trim() ?? "";
    if (!fullName) throw new Error("Cần nhập họ tên thí sinh.");
    if (data.contestants.some((item) =>
      item.competitionId === competitionId &&
      normalizeText(item.fullName) === normalizeText(fullName) &&
      normalizeText(item.className) === normalizeText(className)
    )) throw new Error("Thí sinh này đã có trong cuộc thi.");

    if (input.sourceStudentId) {
      const student = adminService.getStudents(actor).find((item) => item.id === input.sourceStudentId);
      if (!student) throw new Error("Không tìm thấy hồ sơ học sinh để liên kết.");
      if (data.contestants.some((item) => item.competitionId === competitionId && item.sourceStudentId === student.id)) {
        throw new Error("Học sinh này đã được đăng ký trong cuộc thi.");
      }
    }
    const contestant: CompetitionContestant = {
      id: makeId("contestant"),
      competitionId,
      fullName,
      className,
      ...(input.sourceStudentId ? { sourceStudentId: input.sourceStudentId } : {}),
      createdAt: new Date().toISOString(),
    };
    data.contestants.push(contestant);
    data.submissions.push(this.emptySubmission(competition, contestant.id));
    this.writeData(data);
    return contestant;
  }

  previewContestantImport(actor: UserAccount, competitionId: string, rows: ContestantImportRow[]): ContestantImportPreview {
    this.requireSuperAdmin(actor);
    const data = this.readData();
    this.requireEditableCompetition(data, competitionId);
    const seen = new Set<string>();
    const seenStudentCodes = new Set<string>();
    const students = adminService.getStudents(actor);
    let validCount = 0;
    let invalidCount = 0;
    const preview = rows.map((row, index) => {
      const fullName = String(row.fullName ?? "").trim();
      const className = String(row.className ?? "").trim();
      const studentCode = String(row.studentCode ?? "").trim().toLocaleUpperCase();
      const key = `${normalizeText(fullName)}|${normalizeText(className)}`;
      const sourceStudent = studentCode
        ? students.find((student) => student.studentCode.toLocaleUpperCase() === studentCode)
        : undefined;
      let error: string | undefined;
      if (row.invalidReason) error = row.invalidReason;
      else if (!fullName) error = "Thiếu họ tên.";
      else if (seen.has(key)) error = "Trùng thí sinh trong tệp.";
      else if (studentCode && seenStudentCodes.has(studentCode)) error = "Trùng mã học sinh trong tệp.";
      else if (sourceStudent && data.contestants.some((item) =>
        item.competitionId === competitionId && item.sourceStudentId === sourceStudent.id
      )) error = "Học sinh này đã được đăng ký trong cuộc thi.";
      else if (data.contestants.some((item) =>
        item.competitionId === competitionId &&
        normalizeText(item.fullName) === normalizeText(fullName) &&
        normalizeText(item.className) === normalizeText(className)
      )) error = "Thí sinh đã có trong cuộc thi.";
      if (error) invalidCount++;
      else {
        validCount++;
        seen.add(key);
        if (studentCode) seenStudentCodes.add(studentCode);
      }
      return { rowNumber: index + 2, contestant: { fullName, className, studentCode: row.studentCode?.trim() }, ...(error ? { error } : {}) };
    });
    return { rows: preview, validCount, invalidCount };
  }

  importContestants(...args: Parameters<CompetitionService["importContestantsUnlocked"]>): Promise<ReturnType<CompetitionService["importContestantsUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.importContestantsUnlocked(...args));
  }

  private importContestantsUnlocked(actor: UserAccount, competitionId: string, rows: ContestantImportRow[]): CompetitionContestant[] {
    this.requireSuperAdmin(actor);
    const preview = this.previewContestantImport(actor, competitionId, rows);
    if (preview.invalidCount > 0) {
      throw new Error(`Tệp có ${preview.invalidCount} dòng không hợp lệ hoặc trùng; chưa nhập dòng nào.`);
    }
    const data = this.readData();
    const competition = this.requireEditableCompetition(data, competitionId);
    const now = new Date().toISOString();
    const students = adminService.getStudents(actor);
    const contestants = rows.map((row) => {
      const student = row.studentCode
        ? students.find((item) => item.studentCode.toLocaleUpperCase() === row.studentCode!.trim().toLocaleUpperCase())
        : undefined;
      return {
        id: makeId("contestant"),
        competitionId,
        fullName: student?.fullName ?? row.fullName.trim(),
        className: student?.className ?? row.className?.trim() ?? "",
        ...(student ? { sourceStudentId: student.id } : {}),
        createdAt: now,
      };
    });
    data.contestants.push(...contestants);
    data.submissions.push(...contestants.map((contestant) => this.emptySubmission(competition, contestant.id)));
    this.writeData(data);
    return contestants;
  }

  addLinkedStudent(...args: Parameters<CompetitionService["addLinkedStudentUnlocked"]>): Promise<ReturnType<CompetitionService["addLinkedStudentUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.addLinkedStudentUnlocked(...args));
  }

  private addLinkedStudentUnlocked(actor: UserAccount, competitionId: string, studentId: string): CompetitionContestant {
    this.requireSuperAdmin(actor);
    const student = adminService.getStudents(actor).find((item) => item.id === studentId);
    if (!student) throw new Error("Không tìm thấy học sinh hiện có.");
    return this.addContestantUnlocked(actor, competitionId, {
      fullName: student.fullName,
      className: student.className,
      sourceStudentId: student.id,
    });
  }

  saveSubmission(...args: Parameters<CompetitionService["saveSubmissionUnlocked"]>): Promise<ReturnType<CompetitionService["saveSubmissionUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.saveSubmissionUnlocked(...args));
  }

  private saveSubmissionUnlocked(
    actor: UserAccount,
    competitionId: string,
    contestantId: string,
    input: {
      status: SubmissionStatus;
      productDescription: string;
      productUrl: string;
      criteriaScores: Record<string, number>;
      totalScore?: number;
      manualRank?: number;
      feedback: string;
    },
    submissionId?: string
  ): CompetitionSubmission {
    this.requireSuperAdmin(actor);
    const data = this.readData();
    const competition = this.requireEditableCompetition(data, competitionId);
    if (!data.contestants.some((item) => item.id === contestantId && item.competitionId === competitionId)) {
      throw new Error("Không tìm thấy thí sinh trong cuộc thi.");
    }
    this.validateSubmission(competition, input);
    const contestantSubmissions = data.submissions.filter((item) =>
      item.competitionId === competitionId && item.contestantId === contestantId
    );
    let index = submissionId
      ? data.submissions.findIndex((item) => item.id === submissionId && item.competitionId === competitionId && item.contestantId === contestantId)
      : competition.allowMultipleSubmissions
        ? -1
        : data.submissions.findIndex((item) => item.competitionId === competitionId && item.contestantId === contestantId);
    if (submissionId && index < 0) throw new Error("Không tìm thấy bài dự thi cần cập nhật.");
    if (index < 0 && contestantSubmissions.length > 0 && !competition.allowMultipleSubmissions) {
      throw new Error("Cuộc thi chỉ cho phép một bài dự thi cho mỗi thí sinh.");
    }
    const current = index >= 0 ? data.submissions[index] : undefined;
    const now = new Date().toISOString();
    const totalScore = competition.scoringMode === "criteria"
      ? Object.values(input.criteriaScores).reduce((sum, score) => sum + score, 0)
      : input.totalScore;
    const submission: CompetitionSubmission = {
      id: current?.id ?? makeId("submission"),
      competitionId,
      contestantId,
      ...input,
      ...(totalScore !== undefined ? { totalScore } : {}),
      submittedAt: input.status === "not_submitted" ? current?.submittedAt : current?.submittedAt ?? now,
      updatedAt: now,
    };
    if (index >= 0) data.submissions[index] = submission;
    else data.submissions.push(submission);
    this.writeData(data);
    return submission;
  }

  addSubmission(...args: Parameters<CompetitionService["addSubmissionUnlocked"]>): Promise<ReturnType<CompetitionService["addSubmissionUnlocked"]>> {
    return withLocalStorageWriteLock(() => this.addSubmissionUnlocked(...args));
  }

  private addSubmissionUnlocked(actor: UserAccount, competitionId: string, contestantId: string): CompetitionSubmission {
    this.requireSuperAdmin(actor);
    const data = this.readData();
    const competition = this.requireEditableCompetition(data, competitionId);
    if (!competition.allowMultipleSubmissions) {
      throw new Error("Cuộc thi chỉ cho phép một bài dự thi cho mỗi thí sinh.");
    }
    if (!data.contestants.some((item) => item.id === contestantId && item.competitionId === competitionId)) {
      throw new Error("Không tìm thấy thí sinh trong cuộc thi.");
    }
    const submission = this.emptySubmission(competition, contestantId);
    data.submissions.push(submission);
    this.writeData(data);
    return submission;
  }

  getRankings(actor: UserAccount, competitionId: string): Array<{
    contestant: CompetitionContestant;
    submission?: CompetitionSubmission;
    rank?: number;
  }> {
    this.requireSuperAdmin(actor);
    const data = this.readData();
    const competition = data.competitions.find((item) => item.id === competitionId);
    if (!competition) throw new Error("Không tìm thấy cuộc thi.");
    const entries = data.contestants
      .filter((contestant) => contestant.competitionId === competitionId)
      .map((contestant) => {
        const submissions = data.submissions.filter((submission) =>
          submission.competitionId === competitionId &&
          submission.contestantId === contestant.id &&
          submission.status === "valid"
        );
        const submission = submissions.sort((a, b) => this.scoreFor(competition.scoringMode, b) - this.scoreFor(competition.scoringMode, a))[0];
        return { contestant, submission };
      })
      .sort((a, b) => {
        const scoreA = a.submission ? this.scoreFor(competition.scoringMode, a.submission) : Number.NEGATIVE_INFINITY;
        const scoreB = b.submission ? this.scoreFor(competition.scoringMode, b.submission) : Number.NEGATIVE_INFINITY;
        return scoreB - scoreA || a.contestant.fullName.localeCompare(b.contestant.fullName, "vi");
      });
    if (competition.scoringMode === "manual") {
      return entries.map((entry) => ({
        ...entry,
        ...(entry.submission?.manualRank !== undefined ? { rank: entry.submission.manualRank } : {}),
      }));
    }
    let rank = 0;
    let previousScore: number | undefined;
    return entries.map((entry, index) => {
      const rawScore = entry.submission ? this.scoreFor(competition.scoringMode, entry.submission) : Number.NEGATIVE_INFINITY;
      const score = Number.isFinite(rawScore) ? rawScore : undefined;
      if (score !== undefined) {
        if (previousScore === undefined || score !== previousScore) rank = index + 1;
        previousScore = score;
      }
      return { ...entry, ...(score !== undefined ? { rank } : {}) };
    });
  }

  getExportRows(actor: UserAccount, competitionId: string): Array<Record<string, string | number>> {
    this.requireSuperAdmin(actor);
    const data = this.readData();
    const competition = data.competitions.find((item) => item.id === competitionId);
    if (!competition) throw new Error("Không tìm thấy cuộc thi.");
    return this.getRankings(actor, competitionId).map(({ contestant, submission, rank }) => ({
      "Hạng": rank ?? "",
      "Họ và tên": contestant.fullName,
      "Lớp": contestant.className,
      "Trạng thái bài": submission?.status ?? "Chưa có kết quả hợp lệ",
      "Tổng điểm": submission
        ? competition.scoringMode === "criteria"
          ? Object.values(submission.criteriaScores).reduce((sum, score) => sum + score, 0)
          : submission.totalScore ?? ""
        : "",
      "Thứ hạng thủ công": submission?.manualRank ?? "",
      "Nhận xét": submission?.feedback ?? "",
      "Mô tả sản phẩm": submission?.productDescription ?? "",
      "Liên kết sản phẩm": submission?.productUrl ?? "",
    }));
  }

  getBackupData(): CompetitionData {
    return this.readData();
  }

  validateBackupData(value: unknown): value is CompetitionData {
    return isCompetitionData(value);
  }

  restoreBackupData(value: unknown): Promise<void> {
    return withLocalStorageWriteLock(() => this.restoreBackupDataUnlocked(value));
  }

  private restoreBackupDataUnlocked(value: unknown): void {
    if (!isCompetitionData(value)) throw new Error("Dữ liệu cuộc thi trong backup không hợp lệ.");
    this.writeData(value);
  }

  private changeStatus(actor: UserAccount, competitionId: string, status: "ended" | "archived"): Competition {
    this.requireSuperAdmin(actor);
    const data = this.readData();
    const competition = data.competitions.find((item) => item.id === competitionId);
    if (!competition) throw new Error("Không tìm thấy cuộc thi.");
    if (competition.status === "archived") throw new Error("Cuộc thi đã được lưu trữ.");
    const updated = {
      ...competition,
      status,
      updatedAt: new Date().toISOString(),
      ...(status === "ended" ? { closedAt: new Date().toISOString() } : {}),
      ...(status === "archived" ? { archivedAt: new Date().toISOString() } : {}),
    };
    data.competitions[data.competitions.indexOf(competition)] = updated;
    this.writeData(data);
    return updated;
  }

  private validateCompetitionInput(input: Omit<Competition, "id" | "schoolId" | "createdAt" | "updatedAt" | "archivedAt" | "status">): void {
    if (!input.name.trim()) throw new Error("Tên cuộc thi không được để trống.");
    const start = Date.parse(input.startsAt);
    const end = Date.parse(input.endsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu.");
    }
    if (input.scoringMode === "criteria" && input.criteria.length === 0) {
      throw new Error("Chế độ chấm theo tiêu chí cần ít nhất một tiêu chí.");
    }
    const names = new Set<string>();
    for (const criterion of input.criteria) {
      if (!criterion.name.trim() || !Number.isFinite(criterion.maxPoints) || criterion.maxPoints <= 0) {
        throw new Error("Tiêu chí cần tên hợp lệ và điểm tối đa lớn hơn 0.");
      }
      const normalized = normalizeText(criterion.name);
      if (names.has(normalized)) throw new Error("Tên tiêu chí không được trùng.");
      names.add(normalized);
    }
  }

  private validateSubmission(competition: Competition, input: {
    status: SubmissionStatus;
    criteriaScores: Record<string, number>;
    totalScore?: number;
    manualRank?: number;
  }): void {
    const validStatuses: SubmissionStatus[] = ["not_submitted", "submitted", "revision_required", "valid"];
    if (!validStatuses.includes(input.status)) throw new Error("Trạng thái bài dự thi không hợp lệ.");
    if (competition.scoringMode === "criteria") {
      const criteriaIds = new Set(competition.criteria.map((criterion) => criterion.id));
      for (const [criterionId, score] of Object.entries(input.criteriaScores)) {
        const criterion = competition.criteria.find((item) => item.id === criterionId);
        if (!criteriaIds.has(criterionId) || !criterion || !Number.isFinite(score) || score < 0 || score > criterion.maxPoints) {
          throw new Error("Điểm tiêu chí không hợp lệ hoặc vượt điểm tối đa.");
        }
      }
    } else if (input.totalScore !== undefined && (!Number.isFinite(input.totalScore) || input.totalScore < 0)) {
      throw new Error("Tổng điểm phải là số không âm.");
    }
    if (input.manualRank !== undefined && (!Number.isInteger(input.manualRank) || input.manualRank < 1)) {
      throw new Error("Thứ hạng thủ công phải là số nguyên dương.");
    }
  }

  private requireEditableCompetition(data: CompetitionData, competitionId: string): Competition {
    const competition = data.competitions.find((item) => item.id === competitionId);
    if (!competition) throw new Error("Không tìm thấy cuộc thi.");
    if (competition.status === "archived") throw new Error("Cuộc thi đã lưu trữ; kết quả đã khóa.");
    return competition;
  }

  private emptySubmission(competition: Competition, contestantId: string): CompetitionSubmission {
    return {
      id: makeId("submission"),
      competitionId: competition.id,
      contestantId,
      status: "not_submitted",
      productDescription: "",
      productUrl: "",
      criteriaScores: {},
      feedback: "",
      updatedAt: new Date().toISOString(),
    };
  }

  private scoreFor(mode: CompetitionScoringMode, submission: CompetitionSubmission): number {
    if (mode === "criteria") return Object.values(submission.criteriaScores).reduce((sum, score) => sum + score, 0);
    if (mode === "manual") return submission.manualRank === undefined ? Number.NEGATIVE_INFINITY : -submission.manualRank;
    return submission.totalScore ?? Number.NEGATIVE_INFINITY;
  }

  private statusForDates(startsAt: string, endsAt: string): "preparing" | "ongoing" | "ended" {
    const now = Date.now();
    if (now < Date.parse(startsAt)) return "preparing";
    if (now >= Date.parse(endsAt)) return "ended";
    return "ongoing";
  }
}

export const competitionService = new CompetitionService();
