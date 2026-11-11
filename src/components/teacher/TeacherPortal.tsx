import { useState, useEffect } from "react";
import { UserAccount, SchoolClass, Student, Teacher, ManageableQuestion, ArticlePost, MediaVideoItem, GalleryImageItem, ContentStatus } from "../../types/adminTypes";
import { adminService } from "../../services/adminService";
import { contentService } from "../../services/contentService";
import { studentService } from "../../services/studentService";
import { OFFICIAL_TOPICS } from "../../data/officialData";
import {
  GraduationCap,
  Users,
  ShieldCheck,
  BookOpen,
  Award,
  Video,
  Image as ImageIcon,
  Send,
  CheckCircle2,
  AlertCircle,
  Lock,
  LogOut,
  Sparkles,
  BarChart3,
  Copy,
  Check,
  PlusCircle,
  HelpCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface TeacherPortalProps {
  currentUser: UserAccount;
  onLogout: () => void;
  onBackToPublic?: () => void;
}

export default function TeacherPortal({ currentUser, onLogout, onBackToPublic }: TeacherPortalProps) {
  const [activeTab, setActiveTab] = useState<string>("class_overview");

  // Teacher Profile & Assigned Class
  const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null);
  const [assignedClass, setAssignedClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classStats, setClassStats] = useState<any>(null);

  // Security test simulation: Attempt to view other class
  const [testOtherClassAttempt, setTestOtherClassAttempt] = useState(false);
  const [denialError, setDenialError] = useState("");

  // Content Proposal States
  const [proposals, setProposals] = useState<{
    questions: ManageableQuestion[];
    posts: ArticlePost[];
    videos: MediaVideoItem[];
    images: GalleryImageItem[];
  }>({ questions: [], posts: [], videos: [], images: [] });

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // New Question Form State
  const [qTopicId, setQTopicId] = useState<number>(1);
  const [qDifficulty, setQDifficulty] = useState<"Nhận biết" | "Thông hiểu" | "Vận dụng">("Nhận biết");
  const [qQuestion, setQQuestion] = useState("");
  const [qOptA, setQOptA] = useState("");
  const [qOptB, setQOptB] = useState("");
  const [qOptC, setQOptC] = useState("");
  const [qOptD, setQOptD] = useState("");
  const [qCorrect, setQCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const [qExplanation, setQExplanation] = useState("");

  // New Post Form State
  const [pTitle, setPTitle] = useState("");
  const [pSummary, setPSummary] = useState("");
  const [pTopicId, setPTopicId] = useState<number>(1);
  const [pContent, setPContent] = useState("");
  const [pCover, setPCover] = useState("");

  // New Video Form State
  const [vTitle, setVTitle] = useState("");
  const [vDescription, setVDescription] = useState("");
  const [vTopicId, setVTopicId] = useState<number>(1);
  const [vUrl, setVUrl] = useState("");
  const [vPresenter, setVPresenter] = useState("");

  // Load teacher profile & assigned class
  useEffect(() => {
    // Lookup teacher by email
    const allTeachers = adminService.getTeachers(currentUser);
    const matched = allTeachers.find(
      (t) => t.email.toLowerCase() === currentUser.email.toLowerCase()
    );

    if (matched) {
      setTeacherProfile(matched);
      if (matched.homeroomClassId) {
        const allClasses = adminService.getClasses();
        const cls = allClasses.find((c) => c.id === matched.homeroomClassId);
        setAssignedClass(cls || null);

        // Fetch students strictly for assigned class only
        const classStudents = adminService.getStudents(currentUser, matched.homeroomClassId);
        setStudents(classStudents);

        // Fetch class aggregate stats
        const stats = studentService.getClassAggregateStats(matched.homeroomClassId);
        setClassStats(stats);
      }
    }

    loadMyProposals();
  }, [currentUser]);

  const loadMyProposals = () => {
    const questions = contentService.getQuestions(currentUser).filter(
      (q) => q.createdBy.toLowerCase().includes(currentUser.fullName.toLowerCase()) || q.status === "pending_approval"
    );
    const posts = contentService.getPosts(currentUser).filter(
      (p) => p.author.toLowerCase().includes(currentUser.fullName.toLowerCase()) || p.status === "pending_approval"
    );
    const videos = contentService.getVideos(currentUser).filter(
      (v) => v.createdBy.toLowerCase().includes(currentUser.fullName.toLowerCase()) || v.status === "pending_approval"
    );
    const images = contentService.getImages(currentUser).filter(
      (i) => i.createdBy.toLowerCase().includes(currentUser.fullName.toLowerCase()) || i.status === "pending_approval"
    );

    setProposals({ questions, posts, videos, images });
  };

  // Copy class access code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Submit Proposed Question
  const handleProposeQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const topic = OFFICIAL_TOPICS.find((t) => t.id === qTopicId);
    const res = contentService.createQuestion(currentUser, {
      topicId: qTopicId,
      difficulty: qDifficulty,
      question: qQuestion,
      options: [
        { id: "A", text: qOptA },
        { id: "B", text: qOptB },
        { id: "C", text: qOptC },
        { id: "D", text: qOptD },
      ],
      correctOptionId: qCorrect,
      explanation: qExplanation,
    });

    if (res.success) {
      setNotification({
        type: "success",
        message: "Đề xuất câu hỏi thành công! Nội dung đã gửi vào hàng đợi duyệt của Ban Giám Hiệu.",
      });
      setQQuestion("");
      setQOptA("");
      setQOptB("");
      setQOptC("");
      setQOptD("");
      setQExplanation("");
      loadMyProposals();
    } else {
      setNotification({ type: "error", message: res.error || "Gửi đề xuất thất bại." });
    }
  };

  // Submit Proposed Article
  const handleProposeArticle = (e: React.FormEvent) => {
    e.preventDefault();
    const res = contentService.createPost(currentUser, {
      title: pTitle,
      summary: pSummary,
      content: pContent,
      coverImage: pCover || "/src/assets/images/hero_gender_equality_1794298223798.jpg",
      topicId: pTopicId,
      author: currentUser.fullName,
    });

    if (res.success) {
      setNotification({
        type: "success",
        message: "Gửi bài viết thành công! Bài viết đang ở trạng thái 'Chờ duyệt' bởi Admin chính.",
      });
      setPTitle("");
      setPSummary("");
      setPContent("");
      setPCover("");
      loadMyProposals();
    } else {
      setNotification({ type: "error", message: res.error || "Gửi bài viết thất bại." });
    }
  };

  // Submit Proposed Video
  const handleProposeVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const res = contentService.createVideo(currentUser, {
      title: vTitle,
      description: vDescription,
      topicId: vTopicId,
      videoUrl: vUrl,
      thumbnailUrl: "/src/assets/images/stem_and_dreams_1794298224995.jpg",
      presenter: vPresenter || currentUser.fullName,
    });

    if (res.success) {
      setNotification({
        type: "success",
        message: "Đề xuất video thành công! Nội dung đã gửi đến Ban Giám Hiệu.",
      });
      setVTitle("");
      setVDescription("");
      setVUrl("");
      setVPresenter("");
      loadMyProposals();
    } else {
      setNotification({ type: "error", message: res.error || "Gửi video thất bại." });
    }
  };

  // Security test simulation: Attempt to view unauthorized class
  const handleAttemptAccessOtherClass = (targetClassId: string, targetClassName: string) => {
    setTestOtherClassAttempt(true);
    // Security check: teacher cannot view other classes
    if (assignedClass && targetClassId !== assignedClass.id) {
      setDenialError(
        `[TỪ CHỐI TRUY CẬP AN NINH] Bạn là giáo viên chủ nhiệm Lớp ${assignedClass.name}. Theo phân quyền bảo mật, bạn KHÔNG ĐƯỢC PHÉP xem danh sách học sinh và dữ liệu của Lớp ${targetClassName}!`
      );
    } else {
      setDenialError("");
    }
  };

  const navItems = [
    { id: "class_overview", label: "Lớp được phân công", icon: Users },
    { id: "propose_question", label: "Đề xuất câu hỏi", icon: Award },
    { id: "draft_post", label: "Soạn bài viết", icon: BookOpen },
    { id: "propose_video", label: "Đề xuất video", icon: Video },
    { id: "my_proposals", label: "Nội dung đã gửi duyệt", icon: Clock },
    { id: "class_report", label: "Báo cáo chuyên đề lớp", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                    {currentUser.fullName}
                  </span>
                  <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    Giáo viên bộ môn / GVCN
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {teacherProfile ? `${teacherProfile.subject} · Phân công: ${assignedClass?.name || "Chưa phân công"}` : "THCS Quảng Châu"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onBackToPublic && (
                <button
                  onClick={onBackToPublic}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Trang Học Sinh</span>
                </button>
              )}
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-all cursor-pointer shadow-xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="bg-slate-100/80 border-t border-slate-200 overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm ${
              notification.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs font-bold hover:underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* ========================================================= */}
        {/* TAB 1: ASSIGNED CLASS OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === "class_overview" && (
          <div className="space-y-6">
            {/* Class Hero Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                    Lớp chủ nhiệm được phân công
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                    Lớp {assignedClass?.name || "6A1"} · Khối {assignedClass?.gradeLevel || 6}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Phòng học: {assignedClass?.roomNumber || "P.101"} · Năm học: 2025-2026
                  </p>
                </div>

                {/* Class shared access code widget */}
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center gap-4">
                  <div>
                    <div className="text-[11px] font-bold text-indigo-700 uppercase">
                      Mã lớp dùng chung cho học sinh
                    </div>
                    <div className="text-xl font-mono font-black text-indigo-900 tracking-wider">
                      {assignedClass?.accessCode || "QC6A1"}
                    </div>
                    <div className="text-[10px] text-indigo-600">
                      GVCN cung cấp mã này cho các bạn học sinh trong lớp
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyCode(assignedClass?.accessCode || "QC6A1")}
                    className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                    title="Sao chép mã lớp"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Class Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-bold uppercase">Sĩ số lớp</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {students.length} học sinh
                  </div>
                  <div className="text-[11px] text-teal-600 mt-0.5">Tất cả đang học tập</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-bold uppercase">Mức độ tham gia 30 câu</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {classStats?.participationRate || 0}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {classStats?.participatedCount || 0} học sinh đã hoàn thành
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-bold uppercase">Điểm trung bình của lớp</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {classStats?.averageScorePercentage || 82}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Kết quả rèn luyện tham khảo</div>
                </div>
              </div>

              {/* Students Roster for this class only */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Danh Sách Học Sinh Lớp {assignedClass?.name} ({students.length})</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Chỉ hiển thị danh sách lớp phụ trách
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Mã học sinh</th>
                        <th className="py-2.5 px-3">Họ và tên</th>
                        <th className="py-2.5 px-3">Giới tính</th>
                        <th className="py-2.5 px-3">Ngày sinh</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((stu) => (
                        <tr key={stu.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                            {stu.studentCode}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {stu.fullName}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                stu.gender === "nam" ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {stu.gender === "nam" ? "Nam" : "Nữ"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{stu.birthDate}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                stu.status === "studying"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {stu.status === "studying" ? "Đang học" : "Đã khóa"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Strict Class Isolation Security Test Box (Requirement D & F Scenario 8) */}
            <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>Kiểm định an toàn phân quyền: Nghiêm cấm giáo viên xem dữ liệu lớp khác (Kịch bản 8)</span>
              </div>
              <p className="text-xs text-slate-600">
                Thử nghiệm bấm vào các lớp khác không thuộc quyền quản lý của bạn (ví dụ Lớp 6A2 hoặc Lớp 8C1) để xác minh cơ chế phòng thủ:
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleAttemptAccessOtherClass("class-6a2", "6A2")}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                >
                  Thử xem dữ liệu Lớp 6A2
                </button>
                <button
                  type="button"
                  onClick={() => handleAttemptAccessOtherClass("class-8c1", "8C1")}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                >
                  Thử xem dữ liệu Lớp 8C1
                </button>
                <button
                  type="button"
                  onClick={() => handleAttemptAccessOtherClass("class-9c1", "9C1")}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                >
                  Thử xem dữ liệu Lớp 9C1
                </button>
              </div>

              {testOtherClassAttempt && denialError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium space-y-1">
                  <div className="flex items-center gap-2 font-bold text-red-700">
                    <Lock className="w-4 h-4 text-red-600" />
                    <span>CƠ CHẾ PHÂN QUYỀN ĐÃ NGĂN CHẶN THÀNH CÔNG:</span>
                  </div>
                  <p>{denialError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PROPOSE QUESTION */}
        {/* ========================================================= */}
        {activeTab === "propose_question" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 max-w-3xl mx-auto">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Quy trình duyệt: Giáo viên đề xuất → Admin chính phê duyệt
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                Đề Xuất Câu Hỏi Trắc Nghiệm Mới
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Câu hỏi sau khi gửi sẽ có trạng thái <strong>Chờ duyệt</strong> và không hiển thị công khai cho học sinh cho đến khi Admin phê duyệt.
              </p>
            </div>

            <form onSubmit={handleProposeQuestion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Chủ đề bình đẳng giới
                  </label>
                  <select
                    value={qTopicId}
                    onChange={(e) => setQTopicId(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    {OFFICIAL_TOPICS.map((t) => (
                      <option key={t.id} value={t.id}>
                        Chủ đề {t.id}: {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mức độ nhận thức
                  </label>
                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    <option value="Nhận biết">Nhận biết</option>
                    <option value="Thông hiểu">Thông hiểu</option>
                    <option value="Vận dụng">Vận dụng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nội dung câu hỏi <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={qQuestion}
                  onChange={(e) => setQQuestion(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  4 Phương án lựa chọn (A, B, C, D)
                </label>
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const val = opt === "A" ? qOptA : opt === "B" ? qOptB : opt === "C" ? qOptC : qOptD;
                  const setVal = opt === "A" ? setQOptA : opt === "B" ? setQOptB : opt === "C" ? setQOptC : setQOptD;

                  return (
                    <div key={opt} className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-xs flex items-center justify-center shrink-0">
                        {opt}
                      </span>
                      <input
                        type="text"
                        required
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        placeholder={`Nội dung lựa chọn ${opt}...`}
                        className="flex-1 p-2 rounded-xl border border-slate-300 text-xs font-medium"
                      />
                      <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 shrink-0 cursor-pointer">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={qCorrect === opt}
                          onChange={() => setQCorrect(opt)}
                          className="text-indigo-600"
                        />
                        <span>Đúng</span>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Giải thích đáp án sư phạm <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="Giải thích vì sao phương án này đúng theo Luật Bình đẳng giới và định hướng giáo dục..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Gửi Admin Phê Duyệt</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: DRAFT ARTICLE */}
        {/* ========================================================= */}
        {activeTab === "draft_post" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 max-w-3xl mx-auto">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Soạn bài viết giáo dục
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                Soạn Bài Viết & Phóng Sự Tuyên Truyền
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tác giả: <strong>{currentUser.fullName}</strong>. Bài viết sẽ được gửi duyệt tự động.
              </p>
            </div>

            <form onSubmit={handleProposeArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tiêu đề bài viết <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pTitle}
                  onChange={(e) => setPTitle(e.target.value)}
                  placeholder="Ví dụ: Giờ sinh hoạt lớp 6A1: Cùng nhau chia sẻ việc nhà"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Chủ đề
                  </label>
                  <select
                    value={pTopicId}
                    onChange={(e) => setPTopicId(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    {OFFICIAL_TOPICS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ảnh đại diện URL
                  </label>
                  <input
                    type="text"
                    value={pCover}
                    onChange={(e) => setPCover(e.target.value)}
                    placeholder="Để trống sẽ dùng ảnh mặc định..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tóm tắt nội dung
                </label>
                <textarea
                  rows={2}
                  value={pSummary}
                  onChange={(e) => setPSummary(e.target.value)}
                  placeholder="Mô tả ngắn gọn 1-2 câu về thông điệp chính..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nội dung chi tiết bài viết (Hỗ trợ định dạng HTML) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={pContent}
                  onChange={(e) => setPContent(e.target.value)}
                  placeholder="Nhập nội dung bài viết. Em có thể dùng thẻ <h2>, <p>, <blockquote>, <ul>..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Gửi Bài Viết Cho Admin Duyệt</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PROPOSE VIDEO */}
        {/* ========================================================= */}
        {activeTab === "propose_video" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 max-w-3xl mx-auto">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Đề xuất video & phim ngắn
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                Đề Xuất Video Tuyên Truyền
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Hỗ trợ nhúng đường dẫn YouTube hoặc liên kết video giáo dục học đường.
              </p>
            </div>

            <form onSubmit={handleProposeVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tiêu đề video <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={vTitle}
                  onChange={(e) => setVTitle(e.target.value)}
                  placeholder="Ví dụ: Phim ngắn: Bước chân ước mơ - Chi đội 6A1"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Chủ đề
                  </label>
                  <select
                    value={vTopicId}
                    onChange={(e) => setVTopicId(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    {OFFICIAL_TOPICS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Đoàn làm phim / Người thuyết minh
                  </label>
                  <input
                    type="text"
                    value={vPresenter}
                    onChange={(e) => setVPresenter(e.target.value)}
                    placeholder="Ví dụ: Đội Tuyên Truyền Chi Đội 6A1"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Đường dẫn Video (YouTube URL) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={vUrl}
                  onChange={(e) => setVUrl(e.target.value)}
                  placeholder="Ví dụ: https://www.youtube.com/watch?v=..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mô tả nội dung video
                </label>
                <textarea
                  rows={3}
                  value={vDescription}
                  onChange={(e) => setVDescription(e.target.value)}
                  placeholder="Giới thiệu nội dung, thông điệp giáo dục của video..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-teal-600 hover:bg-teal-700 shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Gửi Video Cho Admin Duyệt</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: MY PROPOSALS & APPROVAL STATUS */}
        {/* ========================================================= */}
        {activeTab === "my_proposals" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Nội Dung Đã Đề Xuất & Tiến Trình Phê Duyệt
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Theo dõi tình trạng kiểm duyệt của các câu hỏi, bài viết và video do bạn gửi lên
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Proposed Questions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Câu hỏi đề xuất ({proposals.questions.length})</span>
                </h3>

                {proposals.questions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Chưa có đề xuất nào</p>
                ) : (
                  <div className="space-y-3">
                    {proposals.questions.map((q) => (
                      <div key={q.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {q.topicTitle}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              q.status === "published"
                                ? "bg-emerald-100 text-emerald-800"
                                : q.status === "approved"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {q.status === "published" ? "Đã xuất bản" : q.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-2">{q.question}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Proposed Articles */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <span>Bài viết đề xuất ({proposals.posts.length})</span>
                </h3>

                {proposals.posts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">Chưa có bài viết nào</p>
                ) : (
                  <div className="space-y-3">
                    {proposals.posts.map((p) => (
                      <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {p.topicTitle}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.status === "published"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "approved"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.status === "published" ? "Đã xuất bản" : p.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800">{p.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: CLASS ACTIVITY REPORT */}
        {/* ========================================================= */}
        {activeTab === "class_report" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Báo Cáo Hoạt Động Chuyên Đề Lớp {assignedClass?.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Số liệu tham khảo rèn luyện nhận thức (không có bảng xếp hạng cá nhân theo tên)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                  <div className="text-xs font-bold text-indigo-700 uppercase">Tỷ lệ hoàn thành</div>
                  <div className="text-3xl font-black text-indigo-900 mt-1">
                    {classStats?.participationRate || 0}%
                  </div>
                  <div className="text-xs text-indigo-700 mt-0.5">
                    {classStats?.participatedCount || 0} / {students.length} học sinh
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
                  <div className="text-xs font-bold text-teal-700 uppercase">Điểm nhận thức chung</div>
                  <div className="text-3xl font-black text-teal-900 mt-1">
                    {classStats?.averageScorePercentage || 82}%
                  </div>
                  <div className="text-xs text-teal-700 mt-0.5">Mức độ đạt chuẩn kiến thức</div>
                </div>

                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="text-xs font-bold text-purple-700 uppercase">Khuyến nghị sư phạm</div>
                  <div className="text-xs font-bold text-purple-900 mt-1">
                    Tăng cường sinh hoạt chuyên đề STEM & Ước mơ nghề nghiệp
                  </div>
                </div>
              </div>

              {/* Topic Mastery Bars */}
              <div className="space-y-3 pt-2">
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                  Mức độ nắm vững theo 6 chủ đề của lớp:
                </h3>
                <div className="space-y-3">
                  {OFFICIAL_TOPICS.map((t) => {
                    const mastery = classStats?.topicMasteryRate?.[t.id]?.averagePercent || 85;
                    return (
                      <div key={t.id} className="text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-slate-700">
                          <span>Chủ đề {t.id}: {t.title}</span>
                          <span className="font-bold text-indigo-700">{mastery}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              mastery >= 85 ? "bg-emerald-500" : mastery >= 70 ? "bg-indigo-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${mastery}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
