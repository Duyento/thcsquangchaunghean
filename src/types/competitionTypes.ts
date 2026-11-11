export type CompetitionStatus = "preparing" | "ongoing" | "ended" | "archived";
export type CompetitionScoringMode = "criteria" | "total" | "manual";
export type SubmissionStatus = "not_submitted" | "submitted" | "revision_required" | "valid";
export const COMPETITION_STORAGE_KEY = "thcs_quang_chau_competitions";

export interface CompetitionCriterion {
  id: string;
  name: string;
  maxPoints: number;
}

export interface Competition {
  id: string;
  schoolId: string;
  name: string;
  description: string;
  rules: string;
  eligibleParticipants: string;
  startsAt: string;
  endsAt: string;
  status: CompetitionStatus;
  scoringMode: CompetitionScoringMode;
  criteria: CompetitionCriterion[];
  allowMultipleSubmissions: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  archivedAt?: string;
}

export interface CompetitionContestant {
  id: string;
  competitionId: string;
  fullName: string;
  className: string;
  sourceStudentId?: string;
  createdAt: string;
}

export interface CompetitionSubmission {
  id: string;
  competitionId: string;
  contestantId: string;
  status: SubmissionStatus;
  productDescription: string;
  productUrl: string;
  criteriaScores: Record<string, number>;
  totalScore?: number;
  manualRank?: number;
  feedback: string;
  submittedAt?: string;
  updatedAt: string;
}

export interface CompetitionData {
  schemaVersion: 1;
  competitions: Competition[];
  contestants: CompetitionContestant[];
  submissions: CompetitionSubmission[];
}

export interface ContestantImportRow {
  fullName: string;
  className?: string;
  studentCode?: string;
  invalidReason?: string;
}

export interface ContestantImportPreview {
  rows: Array<{ rowNumber: number; contestant: ContestantImportRow; error?: string }>;
  validCount: number;
  invalidCount: number;
}

export function isCompetitionData(value: unknown): value is CompetitionData {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  const competitions = value.competitions;
  const contestants = value.contestants;
  const submissions = value.submissions;
  if (!Array.isArray(competitions) || !Array.isArray(contestants) || !Array.isArray(submissions)) {
    return false;
  }
  const competitionIds = new Set<string>();
  for (const item of competitions as unknown[]) {
    if (
      !isRecord(item) ||
      !hasStrings(item, ["id", "schoolId", "name", "description", "rules", "eligibleParticipants", "startsAt", "endsAt", "createdAt", "updatedAt"]) ||
      !["preparing", "ongoing", "ended", "archived"].includes(String(item.status)) ||
      !["criteria", "total", "manual"].includes(String(item.scoringMode)) ||
      typeof item.allowMultipleSubmissions !== "boolean" ||
      !Array.isArray(item.criteria) ||
      item.criteria.some((criterion) =>
        !isRecord(criterion) ||
        !hasStrings(criterion, ["id", "name"]) ||
        typeof criterion.maxPoints !== "number" ||
        !Number.isFinite(criterion.maxPoints) ||
        criterion.maxPoints < 0
      )
    ) return false;
    if (item.archivedAt !== undefined && typeof item.archivedAt !== "string") return false;
    if (item.closedAt !== undefined && typeof item.closedAt !== "string") return false;
    if (competitionIds.has(item.id as string)) return false;
    competitionIds.add(item.id as string);
  }
  const contestantIds = new Set<string>();
  const contestantCompetitionIds = new Map<string, string>();
  for (const contestant of contestants as unknown[]) {
    if (
      !isRecord(contestant) ||
      !hasStrings(contestant, ["id", "competitionId", "fullName", "className", "createdAt"]) ||
      !competitionIds.has(contestant.competitionId as string) ||
      (contestant.sourceStudentId !== undefined && typeof contestant.sourceStudentId !== "string") ||
      contestantIds.has(contestant.id as string)
    ) return false;
    contestantIds.add(contestant.id as string);
    contestantCompetitionIds.set(contestant.id as string, contestant.competitionId as string);
  }
  const submissionIds = new Set<string>();
  for (const submission of submissions as unknown[]) {
    if (
      !isRecord(submission) ||
      !hasStrings(submission, ["id", "competitionId", "contestantId", "status", "productDescription", "productUrl", "feedback", "updatedAt"]) ||
      !["not_submitted", "submitted", "revision_required", "valid"].includes(String(submission.status)) ||
      !competitionIds.has(submission.competitionId as string) ||
      !contestantIds.has(submission.contestantId as string) ||
      contestantCompetitionIds.get(submission.contestantId as string) !== submission.competitionId ||
      !isRecord(submission.criteriaScores) ||
      Object.values(submission.criteriaScores).some((score) => typeof score !== "number" || !Number.isFinite(score) || score < 0) ||
      (submission.totalScore !== undefined && (typeof submission.totalScore !== "number" || !Number.isFinite(submission.totalScore) || submission.totalScore < 0)) ||
      (submission.manualRank !== undefined && (!Number.isInteger(submission.manualRank) || (submission.manualRank as number) < 1)) ||
      (submission.submittedAt !== undefined && typeof submission.submittedAt !== "string") ||
      submissionIds.has(submission.id as string)
    ) return false;
    submissionIds.add(submission.id as string);
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStrings(value: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => typeof value[field] === "string");
}
