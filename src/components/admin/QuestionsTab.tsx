import { useState } from "react";
import { contentService } from "../../services/contentService";
import { adminService } from "../../services/adminService";
import { ManageableQuestion, UserAccount, ContentStatus } from "../../types/adminTypes";
import { OFFICIAL_TOPICS } from "../../data/officialData";
import * as XLSX from "xlsx";
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Copy,
  Edit2,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Send,
  Eye,
  Check,
  RotateCcw,
} from "lucide-react";

interface QuestionsTabProps {
  currentUser: UserAccount;
}

export default function QuestionsTab({ currentUser }: QuestionsTabProps) {
  const [questions, setQuestions] = useState<ManageableQuestion[]>(() =>
    contentService.getQuestions(currentUser)
  );

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<number>(0);
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ManageableQuestion | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<ManageableQuestion | null>(null);
  const [showJsonImportModal, setShowJsonImportModal] = useState(false);

  // Form states
  const [topicId, setTopicId] = useState<number>(1);
  const [difficulty, setDifficulty] = useState<"Nhận biết" | "Thông hiểu" | "Vận dụng">("Nhận biết");
  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState<"A" | "B" | "C" | "D">("A");
  const [explanation, setExplanation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [formStatus, setFormStatus] = useState<ContentStatus>("published");
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // JSON Import State
  const [jsonInput, setJsonInput] = useState("");

  const canManageQuestions = adminService.hasPermission(currentUser, "manage_questions");
  const isSuperAdmin = currentUser.role === "super_admin";

  const refreshList = () => {
    setQuestions(contentService.getQuestions(currentUser));
  };

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.explanation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = topicFilter === 0 || q.topicId === topicFilter;
    const matchesDifficulty = difficultyFilter === "all" || q.difficulty === difficultyFilter;
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesTopic && matchesDifficulty && matchesStatus;
  });

  const resetForm = () => {
    setTopicId(1);
    setDifficulty("Nhận biết");
    setQuestionText("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectOption("A");
    setExplanation("");
    setImageUrl("");
    setFormStatus(isSuperAdmin ? "published" : "draft");
    setFormError("");
  };

  // Open Edit
  const openEdit = (q: ManageableQuestion) => {
    setEditingQuestion(q);
    setTopicId(q.topicId);
    setDifficulty(q.difficulty);
    setQuestionText(q.question);
    setOptionA(q.options.find((o) => o.id === "A")?.text || "");
    setOptionB(q.options.find((o) => o.id === "B")?.text || "");
    setOptionC(q.options.find((o) => o.id === "C")?.text || "");
    setOptionD(q.options.find((o) => o.id === "D")?.text || "");
    setCorrectOption(q.correctOptionId);
    setExplanation(q.explanation);
    setImageUrl(q.imageUrl || "");
    setFormStatus(q.status);
    setFormError("");
  };

  // Save Add
  const handleSaveAdd = async (targetStatus: ContentStatus) => {
    setFormError("");
    if (!questionText.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim() || !explanation.trim()) {
      setFormError("Vui lòng điền đầy đủ câu hỏi, 4 phương án lựa chọn và lời giải thích khoa học sư phạm.");
      return;
    }

    let res;
    try {
      res = await contentService.createQuestion(currentUser, {
        topicId,
        difficulty,
        question: questionText.trim(),
        options: [
          { id: "A", text: optionA.trim() },
          { id: "B", text: optionB.trim() },
          { id: "C", text: optionC.trim() },
          { id: "D", text: optionD.trim() },
        ],
        correctOptionId: correctOption,
        explanation: explanation.trim(),
        imageUrl: imageUrl.trim() || undefined,
        status: targetStatus,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể tạo câu hỏi.");
      return;
    }

    if (res.success) {
      refreshList();
      setShowAddModal(false);
      resetForm();
      setActionSuccess(`Đã tạo thành công câu hỏi [${res.question?.code}]!`);
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể tạo câu hỏi.");
    }
  };

  // Save Edit
  const handleSaveEdit = async (targetStatus: ContentStatus) => {
    if (!editingQuestion) return;
    setFormError("");

    if (!questionText.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim() || !explanation.trim()) {
      setFormError("Vui lòng điền đầy đủ câu hỏi, 4 phương án lựa chọn và lời giải thích.");
      return;
    }

    let res;
    try {
      res = await contentService.updateQuestion(currentUser, editingQuestion.id, {
        topicId,
        difficulty,
        question: questionText.trim(),
        options: [
          { id: "A", text: optionA.trim() },
          { id: "B", text: optionB.trim() },
          { id: "C", text: optionC.trim() },
          { id: "D", text: optionD.trim() },
        ],
        correctOptionId: correctOption,
        explanation: explanation.trim(),
        imageUrl: imageUrl.trim() || undefined,
        status: targetStatus,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật câu hỏi.");
      return;
    }

    if (res.success) {
      refreshList();
      setEditingQuestion(null);
      resetForm();
      setActionSuccess(`Đã cập nhật câu hỏi [${res.question?.code}]!`);
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể cập nhật câu hỏi.");
    }
  };

  // Duplicate / Clone
  const handleDuplicate = async (q: ManageableQuestion) => {
    let res;
    try {
      res = await contentService.duplicateQuestion(currentUser, q.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể nhân bản.");
      return;
    }
    if (res.success) {
      refreshList();
      setActionSuccess(`Đã nhân bản câu hỏi [${q.code}] thành [${res.question?.code}] ở trạng thái Bản nháp!`);
      setTimeout(() => setActionSuccess(""), 4000);
    } else {
      alert(res.error || "Không thể nhân bản.");
    }
  };

  // Delete
  const handleDelete = async (q: ManageableQuestion) => {
    if (q.isDefault && !isSuperAdmin) {
      alert("30 câu hỏi chuẩn hóa của nhà trường chỉ có Admin chính mới có quyền chỉnh sửa/xóa!");
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa câu hỏi [${q.code}]: "${q.question.substring(0, 40)}..."?`)) return;

    let res;
    try {
      res = await contentService.deleteQuestion(currentUser, q.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể xóa câu hỏi.");
      return;
    }
    if (res.success) {
      refreshList();
      setActionSuccess(`Đã xóa thành công câu hỏi [${q.code}]!`);
      setTimeout(() => setActionSuccess(""), 3000);
    } else {
      alert(res.error || "Không thể xóa câu hỏi.");
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(contentService.exportQuestionsJSON());
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Ngan_hang_cau_hoi_THCS_Quang_Chau_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const handleImportJSON = async () => {
    if (!jsonInput.trim()) {
      alert("Vui lòng dán nội dung JSON vào ô nhập!");
      return;
    }
    let res;
    try {
      res = await contentService.importQuestionsJSON(currentUser, jsonInput.trim());
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể nhập JSON.");
      return;
    }
    if (res.success) {
      refreshList();
      setShowJsonImportModal(false);
      setJsonInput("");
      setActionSuccess(`Nhập thành công ${res.count} câu hỏi từ JSON!`);
      setTimeout(() => setActionSuccess(""), 4000);
    } else {
      alert(res.error || "Lỗi nhập JSON.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            <span>Ngân Hàng Câu Hỏi Trắc Nghiệm Bình Đẳng Giới</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ngân hàng 30 câu hỏi chuẩn hóa & các câu hỏi mở rộng. Hỗ trợ tạo mới, nhân bản, phân loại 6 chủ đề, xuất/nhập Excel và JSON
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export JSON */}
          <button
            onClick={handleExportJSON}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Xuất ngân hàng câu hỏi dạng JSON"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-600" />
            <span>Xuất JSON</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={() => contentService.exportQuestionsExcel()}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Xuất ngân hàng câu hỏi dạng Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {canManageQuestions && (
            <>
              {/* Import JSON */}
              <button
                onClick={() => {
                  setShowJsonImportModal(true);
                  setJsonInput("");
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Nhập JSON</span>
              </button>

              {/* Add Question Button */}
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Câu Hỏi Mới</span>
              </button>
            </>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm câu hỏi, mã câu, từ khóa giải thích..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Topic Filter */}
          <div className="lg:col-span-3">
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value={0}>Tất cả 6 chủ đề</option>
              {OFFICIAL_TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  Chủ đề {t.id}: {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="lg:col-span-2">
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value="all">Mọi mức độ</option>
              <option value="Nhận biết">Nhận biết</option>
              <option value="Thông hiểu">Thông hiểu</option>
              <option value="Vận dụng">Vận dụng</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Bản nháp</option>
              <option value="pending_approval">Chờ duyệt</option>
            </select>
          </div>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Hiển thị <strong>{filteredQuestions.length}</strong> / {questions.length} câu hỏi trắc nghiệm
          </span>
          <span className="text-slate-400">
            Lưu ý: Học sinh chỉ nhìn thấy câu hỏi ở trạng thái <strong>"Đã xuất bản"</strong> và tuyệt đối không xem được đáp án trước khi trả lời.
          </span>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            Không tìm thấy câu hỏi nào thỏa mãn bộ lọc.
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <div
              key={q.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all space-y-3 ${
                q.status === "draft"
                  ? "border-amber-200 bg-amber-50/20"
                  : q.status === "pending_approval"
                  ? "border-sky-200 bg-sky-50/20"
                  : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              {/* Header info */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    {q.code}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {q.topicTitle}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {q.difficulty}
                  </span>
                  {q.isDefault && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
                      Chuẩn hóa
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Status badge */}
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                      q.status === "published"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : q.status === "pending_approval"
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {q.status === "published"
                      ? "Đã xuất bản"
                      : q.status === "pending_approval"
                      ? "Chờ duyệt"
                      : "Bản nháp"}
                  </span>

                  {/* Actions */}
                  {canManageQuestions && (
                    <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                      <button
                        onClick={() => setPreviewQuestion(q)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Xem trước câu hỏi"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(q)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Nhân bản câu hỏi này"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(q)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Chỉnh sửa câu hỏi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(q)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa câu hỏi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Question text */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {q.question}
                </p>

                {q.imageUrl && (
                  <div className="max-w-sm rounded-xl overflow-hidden border border-slate-200 my-2">
                    <img src={q.imageUrl} alt="Minh họa câu hỏi" className="w-full h-36 object-cover" />
                  </div>
                )}
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {q.options.map((opt) => {
                  const isCorrect = opt.id === q.correctOptionId;
                  return (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                        isCorrect
                          ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                          isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="flex-1">{opt.text}</span>
                      {isCorrect && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pedagogical explanation */}
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Đáp án đúng: {q.correctOptionId} · Giải thích sư phạm:</span>
                </p>
                <p className="text-slate-700 leading-relaxed font-normal">{q.explanation}</p>
              </div>

              {/* Footer info */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Người tạo: {q.createdBy}</span>
                <span>Cập nhật: {new Date(q.updatedAt).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ==================== MODAL: ADD / EDIT QUESTION ==================== */}
      {(showAddModal || editingQuestion) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <span>{editingQuestion ? `Chỉnh Sửa Câu Hỏi [${editingQuestion.code}]` : "Tạo Mới Câu Hỏi Trắc Nghiệm"}</span>
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingQuestion(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Topic & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Chủ đề giáo dục (*):</label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {OFFICIAL_TOPICS.map((t) => (
                      <option key={t.id} value={t.id}>
                        Chủ đề {t.id}: {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mức độ nhận thức (*):</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Nhận biết">Nhận biết</option>
                    <option value="Thông hiểu">Thông hiểu</option>
                    <option value="Vận dụng">Vận dụng</option>
                  </select>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nội dung câu hỏi (*):</label>
                <textarea
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm giáo dục bình đẳng giới..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Image URL optional */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Đường dẫn hình ảnh minh họa (tùy chọn):</span>
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="URL ảnh HTTPS"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 4 Options & Correct Answer Radio */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">4 Phương án trả lời & Chọn đáp án đúng (*):</span>
                  <span className="text-[11px] text-indigo-600 font-semibold">Tích chọn đáp án đúng bên cạnh</span>
                </div>

                <div className="space-y-2">
                  {[
                    { id: "A", val: optionA, setVal: setOptionA },
                    { id: "B", val: optionB, setVal: setOptionB },
                    { id: "C", val: optionC, setVal: setOptionC },
                    { id: "D", val: optionD, setVal: setOptionD },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="correctOptionRadio"
                          checked={correctOption === item.id}
                          onChange={() => setCorrectOption(item.id as any)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                          correctOption === item.id ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          {item.id}
                        </span>
                      </label>
                      <input
                        type="text"
                        value={item.val}
                        onChange={(e) => item.setVal(e.target.value)}
                        placeholder={`Nội dung đáp án ${item.id}...`}
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                          correctOption === item.id
                            ? "border-emerald-300 bg-emerald-50/30 focus:ring-emerald-500 font-semibold"
                            : "border-slate-200 focus:ring-indigo-500"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <label className="font-bold text-slate-700">Lời giải thích khoa học sư phạm (*):</label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Giải thích căn cứ pháp lý, tính nhân văn và cơ sở giáo dục vì sao đáp án trên là đúng..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingQuestion(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Hủy
                </button>

                <div className="flex gap-2">
                  {/* Save Draft */}
                  <button
                    type="button"
                    onClick={() => (editingQuestion ? handleSaveEdit("draft") : handleSaveAdd("draft"))}
                    className="px-4 py-2 rounded-xl text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold shadow-xs cursor-pointer"
                  >
                    Lưu Bản Nháp
                  </button>

                  {/* Publish or Submit Review */}
                  <button
                    type="button"
                    onClick={() =>
                      editingQuestion
                        ? handleSaveEdit(isSuperAdmin ? "published" : "pending_approval")
                        : handleSaveAdd(isSuperAdmin ? "published" : "pending_approval")
                    }
                    className="px-5 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSuperAdmin ? "Xuất Bản Ngay" : "Gửi Duyệt Bài"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: PREVIEW QUESTION ==================== */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase">Xem Trước Giao Diện Học Sinh</span>
                <h4 className="text-sm font-bold text-slate-900">
                  Câu hỏi [{previewQuestion.code}] · {previewQuestion.topicTitle}
                </h4>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {previewQuestion.question}
              </h3>

              {previewQuestion.imageUrl && (
                <img
                  src={previewQuestion.imageUrl}
                  alt="Minh họa"
                  className="w-full h-40 object-cover rounded-xl"
                />
              )}

              <div className="space-y-2">
                {previewQuestion.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5 text-slate-800"
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                      {opt.id}
                    </span>
                    <span>{opt.text}</span>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-100 text-slate-500 text-[11px]">
                🔒 <strong>Bảo mật sư phạm:</strong> Học sinh sẽ không nhìn thấy đáp án hoặc lời giải thích cho đến khi tự mình lựa chọn phương án trả lời.
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 rounded-xl text-white bg-slate-900 hover:bg-slate-800 font-bold text-xs"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: IMPORT JSON ==================== */}
      {showJsonImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-600" />
                <span>Nhập Ngân Hàng Câu Hỏi Từ JSON</span>
              </h3>
              <button
                onClick={() => setShowJsonImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Dán mảng JSON chứa các câu hỏi theo cấu trúc chuẩn (id, topicId, difficulty, question, options, correctOptionId, explanation).
            </p>

            <textarea
              rows={8}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='[ { "question": "...", "topicId": 1, "difficulty": "Nhận biết", "options": [ { "id": "A", "text": "..." } ], "correctOptionId": "A", "explanation": "..." } ]'
              className="w-full px-3 py-2 font-mono text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowJsonImportModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleImportJSON}
                className="px-5 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 font-bold shadow-xs cursor-pointer text-xs"
              >
                Xác Nhận Nhập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
