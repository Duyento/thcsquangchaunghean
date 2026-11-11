import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { adminService } from "../../services/adminService";
import { competitionService, readContestantExcel } from "../../services/competitionService";
import {
  Competition,
  CompetitionData,
  CompetitionScoringMode,
  CompetitionSubmission,
  ContestantImportRow,
  SubmissionStatus,
} from "../../types/competitionTypes";
import { UserAccount } from "../../types/adminTypes";
import {
  Archive,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Plus,
  Printer,
  Search,
  Trophy,
  Users,
} from "lucide-react";

interface CompetitionsTabProps {
  currentUser: UserAccount;
}

type CompetitionFormValue = Omit<Competition, "id" | "schoolId" | "createdAt" | "updatedAt" | "archivedAt" | "status">;

const EMPTY_FORM: CompetitionFormValue = {
  name: "",
  description: "",
  rules: "",
  eligibleParticipants: "",
  startsAt: "",
  endsAt: "",
  scoringMode: "total",
  criteria: [],
  allowMultipleSubmissions: false,
};

const STATUS_LABEL: Record<Competition["status"], string> = {
  preparing: "Chuẩn bị",
  ongoing: "Đang diễn ra",
  ended: "Đã kết thúc",
  archived: "Đã lưu trữ",
};

const SUBMISSION_LABEL: Record<SubmissionStatus, string> = {
  not_submitted: "Chưa nộp",
  submitted: "Đã nộp",
  revision_required: "Cần bổ sung",
  valid: "Hợp lệ",
};

function localDateTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function toCompetitionInput(form: CompetitionFormValue): CompetitionFormValue {
  return {
    ...form,
    name: form.name.trim(),
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
    criteria: form.criteria.filter((criterion) => criterion.name.trim()),
  };
}

function CompetitionForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: CompetitionFormValue;
  onCancel: () => void;
  onSave: (form: CompetitionFormValue) => void;
}) {
  const [form, setForm] = useState<CompetitionFormValue>(initial);
  const [criterionName, setCriterionName] = useState("");
  const [criterionMax, setCriterionMax] = useState("");
  const [error, setError] = useState("");
  const change = <K extends keyof CompetitionFormValue>(key: K, value: CompetitionFormValue[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!form.startsAt || !form.endsAt) throw new Error("Vui lòng nhập thời gian bắt đầu và kết thúc.");
      onSave(toCompetitionInput(form));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Thông tin cuộc thi chưa hợp lệ.");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <label className="block text-sm font-semibold">Tên cuộc thi
        <input required value={form.name} onChange={(event) => change("name", event.target.value)} className="mt-1 w-full rounded-lg border p-2.5 font-normal" />
      </label>
      <label className="block text-sm font-semibold">Mô tả
        <textarea value={form.description} onChange={(event) => change("description", event.target.value)} rows={2} className="mt-1 w-full rounded-lg border p-2.5 font-normal" />
      </label>
      <label className="block text-sm font-semibold">Thể lệ
        <textarea value={form.rules} onChange={(event) => change("rules", event.target.value)} rows={2} className="mt-1 w-full rounded-lg border p-2.5 font-normal" />
      </label>
      <label className="block text-sm font-semibold">Đối tượng tham gia
        <input value={form.eligibleParticipants} onChange={(event) => change("eligibleParticipants", event.target.value)} className="mt-1 w-full rounded-lg border p-2.5 font-normal" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Bắt đầu
          <input required type="datetime-local" value={localDateTime(form.startsAt)} onChange={(event) => change("startsAt", event.target.value)} className="mt-1 w-full rounded-lg border p-2.5 font-normal" />
        </label>
        <label className="text-sm font-semibold">Kết thúc
          <input required type="datetime-local" value={localDateTime(form.endsAt)} onChange={(event) => change("endsAt", event.target.value)} className="mt-1 w-full rounded-lg border p-2.5 font-normal" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Chế độ chấm
          <select value={form.scoringMode} onChange={(event) => change("scoringMode", event.target.value as CompetitionScoringMode)} className="mt-1 w-full rounded-lg border p-2.5 font-normal">
            <option value="total">Tổng điểm thủ công</option>
            <option value="criteria">Theo tiêu chí</option>
            <option value="manual">Nhập thứ hạng thủ công</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end rounded-lg border p-2.5 text-sm">
          <input type="checkbox" checked={form.allowMultipleSubmissions} onChange={(event) => change("allowMultipleSubmissions", event.target.checked)} />
          Cho phép nhiều bài / thí sinh
        </label>
      </div>
      {form.scoringMode === "criteria" && (
        <div className="space-y-2 rounded-xl border p-3">
          <p className="text-sm font-bold">Tiêu chí chấm</p>
          {form.criteria.map((criterion) => (
            <div key={criterion.id} className="flex items-center justify-between text-sm">
              <span>{criterion.name} · tối đa {criterion.maxPoints} điểm</span>
              <button type="button" onClick={() => change("criteria", form.criteria.filter((item) => item.id !== criterion.id))} className="text-rose-600">Bỏ</button>
            </div>
          ))}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input aria-label="Tên tiêu chí" placeholder="Tên tiêu chí" value={criterionName} onChange={(event) => setCriterionName(event.target.value)} className="min-w-0 flex-1 rounded-lg border p-2" />
            <input aria-label="Điểm tối đa" placeholder="Điểm tối đa" type="number" min="1" value={criterionMax} onChange={(event) => setCriterionMax(event.target.value)} className="w-full rounded-lg border p-2 sm:w-32" />
            <button type="button" className="rounded-lg border px-3 py-2" onClick={() => {
              const maxPoints = Number(criterionMax);
              if (!criterionName.trim() || !Number.isFinite(maxPoints) || maxPoints <= 0) return;
              change("criteria", [...form.criteria, { id: `criterion-${Date.now()}`, name: criterionName.trim(), maxPoints }]);
              setCriterionName("");
              setCriterionMax("");
            }}>Thêm tiêu chí</button>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2">Hủy</button>
        <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Lưu cuộc thi</button>
      </div>
    </form>
  );
}

function SubmissionEditor({
  actor,
  submission,
  competition,
  locked,
  onSave,
}: {
  actor: UserAccount;
  submission: CompetitionSubmission;
  competition: Competition;
  locked: boolean;
  onSave: (submission: CompetitionSubmission) => void;
}) {
  const [status, setStatus] = useState(submission.status);
  const [description, setDescription] = useState(submission.productDescription);
  const [url, setUrl] = useState(submission.productUrl);
  const [feedback, setFeedback] = useState(submission.feedback);
  const [totalScore, setTotalScore] = useState(submission.totalScore?.toString() ?? "");
  const [manualRank, setManualRank] = useState(submission.manualRank?.toString() ?? "");
  const [criteriaScores, setCriteriaScores] = useState(submission.criteriaScores);
  const [message, setMessage] = useState("");

  const save = () => {
    try {
      const saved = competitionService.saveSubmission(
        actor,
        competition.id,
        submission.contestantId,
        {
          status,
          productDescription: description,
          productUrl: url,
          criteriaScores,
          ...(totalScore.trim() ? { totalScore: Number(totalScore) } : {}),
          ...(manualRank.trim() ? { manualRank: Number(manualRank) } : {}),
          feedback,
        },
        submission.id
      );
      onSave(saved);
      setMessage("Đã lưu");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu bài dự thi.");
    }
  };

  return (
    <div className="grid gap-2 rounded-lg border bg-slate-50 p-3 lg:grid-cols-[150px_1fr_1fr_130px_1fr_auto]">
      <select disabled={locked} value={status} onChange={(event) => setStatus(event.target.value as SubmissionStatus)} className="rounded border bg-white p-2 text-sm">
        {Object.entries(SUBMISSION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <input disabled={locked} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả sản phẩm" className="min-w-0 rounded border p-2 text-sm" />
      <input disabled={locked} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Liên kết sản phẩm (nếu có)" className="min-w-0 rounded border p-2 text-sm" />
      {competition.scoringMode === "criteria" ? (
        <div className="flex flex-wrap gap-2">
          {competition.criteria.map((criterion) => (
            <label key={criterion.id} className="text-xs">{criterion.name}
              <input disabled={locked} type="number" min="0" max={criterion.maxPoints} value={criteriaScores[criterion.id] ?? ""} onChange={(event) => setCriteriaScores((current) => ({ ...current, [criterion.id]: Number(event.target.value) }))} className="mt-1 w-20 rounded border p-1.5" />
            </label>
          ))}
        </div>
      ) : competition.scoringMode === "total" ? (
        <input disabled={locked} type="number" min="0" value={totalScore} onChange={(event) => setTotalScore(event.target.value)} placeholder="Tổng điểm" className="rounded border p-2 text-sm" />
      ) : (
        <input disabled={locked} type="number" min="1" step="1" value={manualRank} onChange={(event) => setManualRank(event.target.value)} placeholder="Thứ hạng" className="rounded border p-2 text-sm" />
      )}
      <input disabled={locked} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Nhận xét" className="min-w-0 rounded border p-2 text-sm" />
      {!locked && <button type="button" onClick={save} className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Lưu</button>}
      {message && <p className="text-xs text-slate-600 lg:col-span-full">{message}</p>}
    </div>
  );
}

export default function CompetitionsTab({ currentUser }: CompetitionsTabProps) {
  const [data, setData] = useState<CompetitionData>(() => competitionService.getData(currentUser));
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [importRows, setImportRows] = useState<ContestantImportRow[]>([]);
  const [importSummary, setImportSummary] = useState("");

  const refresh = () => setData(competitionService.getData(currentUser));
  const selected = data.competitions.find((item) => item.id === selectedId);
  const filtered = useMemo(() => data.competitions.filter((competition) =>
    competition.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
    (statusFilter === "all" || competition.status === statusFilter)
  ), [data.competitions, query, statusFilter]);
  const contestants = selected ? data.contestants.filter((item) => item.competitionId === selected.id) : [];
  const submissions = selected ? data.submissions.filter((item) => item.competitionId === selected.id) : [];
  const rankings = selected ? competitionService.getRankings(currentUser, selected.id) : [];
  const students = selected ? adminService.getStudents(currentUser) : [];

  const openCreate = () => {
    setError("");
    setFormMode("create");
  };
  const saveCompetition = (form: CompetitionFormValue) => {
    try {
      if (formMode === "edit" && selected) {
        competitionService.updateCompetition(currentUser, selected.id, form);
      } else {
        const created = competitionService.createCompetition(currentUser, form);
        setSelectedId(created.id);
      }
      refresh();
      setFormMode(null);
      setNotice("Đã lưu cuộc thi.");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu cuộc thi.");
    }
  };

  const handleExcel = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selected) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("Chỉ chấp nhận tệp .xlsx hoặc .xls.");
      event.target.value = "";
      return;
    }
    setError("");
    setImportRows([]);
    setImportSummary("Đang đọc Excel…");
    void readContestantExcel(file).then((rows) => {
        const preview = competitionService.previewContestantImport(currentUser, selected.id, rows);
        setImportRows(rows);
        setImportSummary(`Xem trước ${preview.rows.length} dòng: ${preview.validCount} hợp lệ, ${preview.invalidCount} lỗi/trùng.`);
        setError(preview.rows.filter((row) => row.error).slice(0, 5).map((row) => `Dòng ${row.rowNumber}: ${row.error}`).join(" "));
      }).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Không đọc được tệp Excel.");
        setImportSummary("");
      });
    event.target.value = "";
  };

  const importPreviewedRows = () => {
    if (!selected || !importRows.length) return;
    try {
      const preview = competitionService.previewContestantImport(currentUser, selected.id, importRows);
      if (preview.invalidCount) throw new Error("Còn dòng lỗi/trùng; chưa nhập dòng nào.");
      competitionService.importContestants(currentUser, selected.id, importRows);
      refresh();
      setImportRows([]);
      setImportSummary("Đã nhập danh sách thí sinh.");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể nhập danh sách.");
    }
  };

  const addManualContestant = () => {
    if (!selected) return;
    try {
      competitionService.addContestant(currentUser, selected.id, { fullName: name, className });
      setName("");
      setClassName("");
      setError("");
      refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể thêm thí sinh.");
    }
  };

  const addLinkedStudent = () => {
    if (!selected || !studentId) return;
    try {
      competitionService.addLinkedStudent(currentUser, selected.id, studentId);
      setStudentId("");
      setError("");
      refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể liên kết học sinh.");
    }
  };

  const archiveSelected = () => {
    if (!selected || !window.confirm("Xác nhận khóa chỉnh sửa kết quả và lưu trữ cuộc thi? Sau đó chỉ có thể xem và xuất dữ liệu.")) return;
    try {
      competitionService.archiveCompetition(currentUser, selected.id, true);
      refresh();
      setNotice("Cuộc thi đã lưu trữ và khóa chỉnh sửa.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu trữ cuộc thi.");
    }
  };

  const exportResults = () => {
    if (!selected) return;
    try {
      const rows = competitionService.getExportRows(currentUser, selected.id).map((row) => ({
        ...row,
        "Trạng thái bài": typeof row["Trạng thái bài"] === "string" && row["Trạng thái bài"] in SUBMISSION_LABEL
          ? SUBMISSION_LABEL[row["Trạng thái bài"] as SubmissionStatus]
          : row["Trạng thái bài"],
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "KetQua");
      XLSX.writeFile(workbook, `Ket_qua_${selected.name.replace(/[\\/:*?"<>|]/g, "_")}.xlsx`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể xuất kết quả.");
    }
  };

  if (currentUser.role !== "super_admin") {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">Chỉ Super Admin được quản lý cuộc thi.</p>;
  }

  if (formMode) {
    const initial: CompetitionFormValue = formMode === "edit" && selected
      ? {
          name: selected.name,
          description: selected.description,
          rules: selected.rules,
          eligibleParticipants: selected.eligibleParticipants,
          startsAt: selected.startsAt,
          endsAt: selected.endsAt,
          scoringMode: selected.scoringMode,
          criteria: selected.criteria,
          allowMultipleSubmissions: selected.allowMultipleSubmissions,
        }
      : { ...EMPTY_FORM };
    return (
      <section className="mx-auto max-w-3xl space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
        <button onClick={() => setFormMode(null)} className="inline-flex items-center gap-2 text-sm text-slate-600"><ArrowLeft size={16} /> Quay lại</button>
        <h2 className="text-xl font-bold">{formMode === "create" ? "Tạo cuộc thi" : "Chỉnh sửa cuộc thi"}</h2>
        <CompetitionForm initial={initial} onCancel={() => setFormMode(null)} onSave={saveCompetition} />
      </section>
    );
  }

  if (selected) {
    const locked = selected.status === "archived";
    return (
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => { setSelectedId(""); setError(""); }} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><ArrowLeft size={16} /> Tất cả cuộc thi</button>
          <div className="flex flex-wrap gap-2">
            {!locked && <button onClick={() => setFormMode("edit")} className="rounded-lg border bg-white px-3 py-2 text-sm">Sửa thông tin</button>}
            {!locked && selected.status !== "ended" && <button onClick={() => {
              try { competitionService.closeCompetition(currentUser, selected.id); refresh(); }
              catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể đóng cuộc thi."); }
            }} className="rounded-lg border bg-white px-3 py-2 text-sm">Đóng cuộc thi</button>}
            {!locked && <button onClick={archiveSelected} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white"><Archive size={16} /> Khóa & lưu trữ</button>}
            <button onClick={exportResults} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"><Download size={16} /> Xuất Excel</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><Printer size={16} /> In</button>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900 to-teal-800 p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-sm text-white/70">{STATUS_LABEL[selected.status]}</p><h2 className="mt-1 text-2xl font-bold">{selected.name}</h2><p className="mt-2 text-sm">{selected.description}</p></div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{contestants.length} thí sinh</span>
          </div>
          <p className="mt-3 text-xs text-white/80">{new Date(selected.startsAt).toLocaleString()} — {new Date(selected.endsAt).toLocaleString()}</p>
          {selected.rules && <p className="mt-2 whitespace-pre-wrap text-sm">Thể lệ: {selected.rules}</p>}
        </div>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="space-y-4 rounded-2xl border bg-white p-4">
            <h3 className="font-bold">Thí sinh</h3>
            {!locked && (
              <>
                <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto]">
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Họ tên thí sinh" className="min-w-0 rounded-lg border p-2" />
                  <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Lớp (tùy chọn)" className="min-w-0 rounded-lg border p-2" />
                  <button onClick={addManualContestant} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Thêm</button>
                </div>
                {students.length > 0 && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="min-w-0 flex-1 rounded-lg border p-2">
                      <option value="">Liên kết học sinh hiện có (không sửa hồ sơ)</option>
                      {students.map((student) => <option key={student.id} value={student.id}>{student.fullName} · {student.className}</option>)}
                    </select>
                    <button disabled={!studentId} onClick={addLinkedStudent} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Liên kết</button>
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <FileSpreadsheet size={16} /> Nhập Excel
                  <input type="file" accept=".xlsx,.xls" onChange={handleExcel} className="sr-only" />
                </label>
                {importSummary && <div className="rounded-lg bg-slate-50 p-3 text-sm">{importSummary}{importRows.length > 0 && <button onClick={importPreviewedRows} className="ml-3 font-semibold text-blue-700">Xác nhận nhập</button>}</div>}
              </>
            )}
            <div className="divide-y">
              {contestants.map((contestant) => (
                <div key={contestant.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 truncate">{contestant.fullName}{contestant.className ? ` · ${contestant.className}` : ""}</span>
                  {contestant.sourceStudentId && <span className="shrink-0 rounded bg-teal-50 px-2 py-1 text-xs text-teal-800">Đã liên kết</span>}
                </div>
              ))}
              {contestants.length === 0 && <p className="py-3 text-sm text-slate-500">Chưa có thí sinh.</p>}
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">Bài dự thi & chấm điểm</h3>
              <span className="text-xs text-slate-500">{selected.allowMultipleSubmissions ? "Cho phép nhiều bài" : "Một bài / thí sinh"}</span>
            </div>
            {contestants.map((contestant) => {
              const contestantSubmissions = submissions.filter((submission) => submission.contestantId === contestant.id);
              return (
                <div key={contestant.id} className="space-y-2 border-b pb-3 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{contestant.fullName}</p>
                    {selected.allowMultipleSubmissions && !locked && (
                      <button onClick={() => {
                        try {
                          competitionService.addSubmission(currentUser, selected.id, contestant.id);
                          refresh();
                        } catch (reason) {
                          setError(reason instanceof Error ? reason.message : "Không thể tạo bài dự thi.");
                        }
                      }} className="rounded-lg border px-2 py-1 text-xs">+ Bài mới</button>
                    )}
                  </div>
                  {contestantSubmissions.map((submission) => (
                    <SubmissionEditor
                      key={submission.id}
                      actor={currentUser}
                      submission={submission}
                      competition={selected}
                      locked={locked}
                      onSave={() => refresh()}
                    />
                  ))}
                </div>
              );
            })}
            <div>
              <h3 className="mb-2 inline-flex items-center gap-2 font-bold"><Trophy size={17} /> Xếp hạng</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead><tr className="border-b text-xs text-slate-500"><th className="p-2">Hạng</th><th className="p-2">Thí sinh</th><th className="p-2">Điểm / Trạng thái</th><th className="p-2">Nhận xét</th></tr></thead>
                  <tbody>{rankings.map(({ contestant, submission, rank }) => (
                    <tr key={contestant.id} className="border-b last:border-0">
                      <td className="p-2 font-bold">{rank ?? "—"}</td>
                      <td className="p-2">{contestant.fullName}</td>
                      <td className="p-2">{submission ? selected.scoringMode === "manual" ? `Hạng ${submission.manualRank ?? "—"}` : `${submission.totalScore ?? Object.values(submission.criteriaScores).reduce((sum, score) => sum + score, 0)} điểm` : "Chưa có kết quả hợp lệ"}</td>
                      <td className="p-2">{submission?.feedback ?? "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        {locked && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Kết quả đã khóa. Cuộc thi chỉ còn chế độ xem và xuất dữ liệu.</p>}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-2xl font-extrabold text-slate-900">Quản lý cuộc thi</h2><p className="mt-1 text-sm text-slate-500">Tạo đợt thi, quản lý thí sinh và tổng kết kết quả.</p></div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white shadow-sm"><Plus size={18} /> Tạo cuộc thi</button>
      </header>
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-white px-3"><Search size={17} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên cuộc thi" className="min-w-0 flex-1 py-2.5 outline-none" /></label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border bg-white px-3 py-2.5">
          <option value="all">Mọi trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((competition) => {
          const count = data.contestants.filter((contestant) => contestant.competitionId === competition.id).length;
          return (
            <button key={competition.id} onClick={() => { setSelectedId(competition.id); setError(""); setNotice(""); }} className="rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-2"><h3 className="font-bold text-slate-900">{competition.name}</h3><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs">{STATUS_LABEL[competition.status]}</span></div>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-500">{competition.description || competition.rules || "Chưa có mô tả."}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{new Date(competition.startsAt).toLocaleDateString()} – {new Date(competition.endsAt).toLocaleDateString()}</span><span className="inline-flex items-center gap-1"><Users size={14} /> {count}</span></div>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">Chưa có cuộc thi phù hợp.</p>}
      </div>
    </section>
  );
}
