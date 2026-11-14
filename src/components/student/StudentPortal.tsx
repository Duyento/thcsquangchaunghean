import { useState, useEffect } from "react";
import { StudentSession, SanitizedQuestion, StudentQuizResult, ClassAggregateStats, ArticlePost, MediaVideoItem, GalleryImageItem } from "../../types/adminTypes";
import { studentService } from "../../services/studentService";
import { contentService } from "../../services/contentService";
import { OFFICIAL_TOPICS } from "../../data/officialData";
import { SITUATIONS_DATA } from "../../data/situationsData";
import {
  GraduationCap,
  LogOut,
  Sparkles,
  BookOpen,
  Award,
  Video,
  Image as ImageIcon,
  HeartHandshake,
  BarChart3,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Info,
  Calendar,
  Eye,
  Check,
  ChevronRight,
  ExternalLink,
  Users,
  Search,
} from "lucide-react";

interface StudentPortalProps {
  session: StudentSession;
  onLogout: () => void;
  onBackToPublic?: () => void;
}

export default function StudentPortal({ session, onLogout, onBackToPublic }: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<string>("home");

  // Content data
  const [questions, setQuestions] = useState<SanitizedQuestion[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [articles, setArticles] = useState<ArticlePost[]>([]);
  const [videos, setVideos] = useState<MediaVideoItem[]>([]);
  const [images, setImages] = useState<GalleryImageItem[]>([]);

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [evaluatedAnswers, setEvaluatedAnswers] = useState<
    Record<string, { isCorrect: boolean; correctOptionId: "A" | "B" | "C" | "D"; explanation: string }>
  >({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState<StudentQuizResult | null>(null);
  const [activityLogWarning, setActivityLogWarning] = useState("");

  // Class stats and personal history
  const [classStats, setClassStats] = useState<ClassAggregateStats>(() =>
    studentService.getClassAggregateStats(session.classId)
  );
  const [myHistory, setMyHistory] = useState<StudentQuizResult[]>(() =>
    studentService.getStudentResults(session.studentId)
  );

  // Selected article / video modal state
  const [selectedArticle, setSelectedArticle] = useState<ArticlePost | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<MediaVideoItem | null>(null);

  // Commitment state
  const [signedCommitment, setSignedCommitment] = useState(false);
  const [selectedCommitments, setSelectedCommitments] = useState<string[]>([
    "Tôn trọng bạn bè dù là nam hay nữ trong lớp",
    "Không trêu chọc hay gán ghép định kiến nghề nghiệp",
    "Chủ động chia sẻ việc nhà với gia đình mỗi ngày",
  ]);

  // Load content
  useEffect(() => {
    // 1. Sanitized questions without answers
    setQuestions(studentService.getSanitizedQuestions());
    setQuestionsLoaded(true);

    // 2. Published articles
    const posts = contentService.getPosts().filter((p) => p.status === "published");
    setArticles(posts);

    // 3. Published videos
    const vids = contentService.getVideos().filter((v) => v.status === "published");
    setVideos(vids);

    // 4. Published images
    const imgs = contentService.getImages().filter((i) => i.status === "published");
    setImages(imgs);
  }, []);

  // Answer a question in quiz
  const handleSelectOption = (questionId: string, optionId: "A" | "B" | "C" | "D") => {
    if (evaluatedAnswers[questionId]) return; // Already answered

    setUserAnswers((prev) => ({ ...prev, [questionId]: optionId }));

    // Evaluate answer on the fly via studentService (server-like evaluation)
    const evaluation = studentService.evaluateAnswer(questionId, optionId);
    setEvaluatedAnswers((prev) => ({
      ...prev,
      [questionId]: evaluation,
    }));
  };

  // Complete quiz
  const handleFinishQuiz = async () => {
    try {
      const res = await studentService.submitQuizResult(session, userAnswers);
      setActivityLogWarning(res.error ?? "");
      if (res.result) {
        setQuizResult(res.result);
        setQuizCompleted(true);
        setClassStats(studentService.getClassAggregateStats(session.classId));
        setMyHistory(studentService.getStudentResults(session.studentId));
      }
    } catch (error) {
      setActivityLogWarning(error instanceof Error ? error.message : "Không thể lưu kết quả bài kiểm tra.");
    }
  };

  // Restart quiz
  const handleRestartQuiz = () => {
    setUserAnswers({});
    setEvaluatedAnswers({});
    setCurrentQuestionIndex(0);
    setQuizCompleted(false);
    setQuizResult(null);
    setActivityLogWarning("");
  };

  const navTabs = [
    { id: "home", label: "Trang chủ", icon: Sparkles },
    { id: "topics", label: "Chủ đề", icon: BookOpen },
    { id: "quiz", label: "Thử thách kiến thức", icon: Award },
    { id: "situations", label: "Tình huống", icon: HelpCircle },
    { id: "articles", label: "Bài viết", icon: BookOpen },
    { id: "videos", label: "Video học đường", icon: Video },
    { id: "gallery", label: "Hình ảnh", icon: ImageIcon },
    { id: "commitment", label: "Cam kết", icon: HeartHandshake },
    { id: "stats", label: "Kết quả học tập", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: School badge & Student Identity */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center text-white">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                    {session.fullName}
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    Lớp {session.className}
                  </span>
                  <span className="hidden sm:inline bg-teal-100 text-teal-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    Khối {session.gradeLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Trường THCS Quảng Châu · Mã HS: {session.studentCode}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {onBackToPublic && (
                <button
                  onClick={onBackToPublic}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <span>Xem Website Chung</span>
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

        {/* Sub-bar: Navigation Tabs */}
        <nav
          aria-label="Điều hướng học sinh"
          tabIndex={0}
          style={{ scrollbarWidth: "thin", scrollbarColor: "#087e78 #e6f4f2", touchAction: "pan-x" }}
          className="w-full min-w-0 overflow-x-auto overscroll-x-contain border-t border-slate-200 bg-slate-100/80 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-1 sm:px-6 lg:px-8">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-brand shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-brand" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Pedagogical Notice Banner (Requirement E) */}
      <div className="border-b border-brand/20 bg-brand-light py-2.5 px-4 text-xs text-ink">
        <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
          <p className="font-medium">
            <strong>Lưu ý sư phạm:</strong> Do học sinh sử dụng mã lớp dùng chung để đăng nhập thuận tiện, kết quả thử thách chỉ mang tính chất <strong>tham khảo & tự rèn luyện nhận thức</strong>. Nhà trường <strong>không công bố bảng xếp hạng theo tên</strong> và <strong>không dùng kết quả này để xếp loại học sinh</strong>.
          </p>
        </div>
      </div>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* ========================================================= */}
        {/* TAB 1: HOME */}
        {/* ========================================================= */}
        {activeTab === "home" && (
          <div className="space-y-6">
            {/* Welcome Hero Banner */}
            <div className="relative rounded-2xl bg-ink text-white p-6 sm:p-8 overflow-hidden shadow-sm">
              <div className="relative z-10 max-w-2xl space-y-3">
                <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-teal-100 text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
                  Không gian học đường THCS Quảng Châu
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Chào em, {session.fullName}!
                </h1>
                <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                  Bình đẳng giới là khi mỗi bạn học sinh dù nam hay nữ đều được tôn trọng, tự do nuôi dưỡng ước mơ và có cơ hội phát triển công bằng. Hãy cùng lớp {session.className} khám phá kiến thức và {questionsLoaded ? `thử sức với ${questions.length} câu hỏi` : "khám phá thử thách kiến thức"} nhé!
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab("quiz")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all hover:scale-105 cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-slate-900" />
                    <span>{questionsLoaded && questions.length > 0 ? `Làm thử thách ${questions.length} câu` : "Thử thách kiến thức"}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("topics")}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs sm:text-sm backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Khám phá 6 chủ đề</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics of the Class */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Mức độ tham gia lớp {session.className}</div>
                  <div className="text-2xl font-black text-slate-900">{classStats.participationRate}%</div>
                  <div className="text-[11px] text-teal-600 font-semibold">{classStats.participatedCount}/{classStats.totalStudentsInClass} bạn đã tham gia</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Điểm trung bình của lớp</div>
                  <div className="text-2xl font-black text-slate-900">{classStats.averageScorePercentage}%</div>
                  <div className="text-[11px] text-slate-500 font-medium">Kết quả học hỏi chung (tham khảo)</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase">Lần làm bài của em</div>
                  <div className="text-2xl font-black text-slate-900">{myHistory.length} lần</div>
                  <div className="text-[11px] text-purple-700 font-semibold">
                    {myHistory.length > 0 ? `Điểm gần nhất: ${myHistory[0].scorePercentage}%` : "Chưa làm lần nào"}
                  </div>
                </div>
              </div>
            </div>

            {/* Learning Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div
                onClick={() => setActiveTab("topics")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                  6 Chủ Đề Cốt Lõi
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hiểu rõ bản chất bình đẳng giới, sẻ chia việc nhà, tự do nghề nghiệp và phòng ngừa bạo lực học đường.
                </p>
                <div className="text-xs font-bold text-blue-600 flex items-center gap-1">
                  <span>Khám phá ngay</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              <div
                onClick={() => setActiveTab("quiz")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 group-hover:text-teal-600 transition-colors">
                  {questionsLoaded && questions.length > 0 ? `Thử thách ${questions.length} câu hỏi` : "Thử thách kiến thức"}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Thử thách trắc nghiệm với giải thích chi tiết sau mỗi câu trả lời, không lộ đáp án trước khi làm.
                </p>
                <div className="text-xs font-bold text-teal-600 flex items-center gap-1">
                  <span>Làm bài ngay</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              <div
                onClick={() => setActiveTab("situations")}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">
                  10 Tình Huống Thực Tế
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Các câu chuyện thường gặp tại trường lớp, gia đình và cộng đồng kèm lời khuyên chuyên gia.
                </p>
                <div className="text-xs font-bold text-purple-600 flex items-center gap-1">
                  <span>Xem tình huống</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Featured Articles & Videos Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Articles */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Bài viết & Phóng sự học đường</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("articles")}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Xem tất cả ({articles.length})
                  </button>
                </div>
                <div className="space-y-3">
                  {articles.slice(0, 3).map((art) => (
                    <div
                      key={art.id}
                      onClick={() => setSelectedArticle(art)}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer flex gap-3 items-center"
                    >
                      {art.coverImage && (
                        <img
                          src={art.coverImage}
                          alt={art.title}
                          className="w-16 h-12 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {art.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{art.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Videos */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                    <Video className="w-4 h-4 text-teal-600" />
                    <span>Rạp phim học đường & Video</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("videos")}
                    className="text-xs font-bold text-teal-600 hover:underline cursor-pointer"
                  >
                    Xem tất cả ({videos.length})
                  </button>
                </div>
                <div className="space-y-3">
                  {videos.slice(0, 3).map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => setSelectedVideo(vid)}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 transition-colors cursor-pointer flex gap-3 items-center"
                    >
                      {vid.thumbnailUrl && (
                        <img
                          src={vid.thumbnailUrl}
                          alt={vid.title}
                          className="w-16 h-12 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {vid.title}
                        </h4>
                        <p className="text-[11px] text-teal-700 mt-0.5 truncate">{vid.presenter}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: 6 TOPICS */}
        {/* ========================================================= */}
        {activeTab === "topics" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                6 Chủ Đề Cốt Lõi Về Bình Đẳng Giới
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Chương trình truyền thông giáo dục dành riêng cho học sinh THCS Quảng Châu
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {OFFICIAL_TOPICS.map((topic) => (
                <div
                  key={topic.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-extrabold text-sm flex items-center justify-center">
                        {topic.id}
                      </span>
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">
                        THCS Quảng Châu
                      </span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                      {topic.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {topic.objectives.join(". ")}.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">5 câu hỏi kiểm tra</span>
                    <button
                      onClick={() => {
                        setActiveTab("quiz");
                        // Find first question of this topic
                        const idx = questions.findIndex((q) => q.topicId === topic.id);
                        if (idx !== -1) setCurrentQuestionIndex(idx);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Luyện tập chủ đề</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TRÒ CHƠI 30 CÂU HỎI (ANSWERS HIDDEN UNTIL SUBMITTED) */}
        {/* ========================================================= */}
        {activeTab === "quiz" && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>Thử thách kiến thức{questionsLoaded ? ` (${questions.length} câu)` : ""}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Hệ thống bảo đảm tính sư phạm: Đáp án đúng và giải thích chỉ hiển thị sau khi em chọn câu trả lời!
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-600">
                  Đã trả lời: {Object.keys(userAnswers).length}/{questions.length}
                </span>
                <button
                  onClick={handleRestartQuiz}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm lại từ đầu</span>
                </button>
              </div>
            </div>

            {/* If Completed -> Show Results Summary */}
            {quizCompleted && quizResult ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-md text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Hoàn thành thử thách
                  </span>
                  <h3 className="text-2xl font-extrabold text-slate-900">
                    Chúc mừng {session.fullName}!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Em đã hoàn thành thử thách gồm {quizResult.totalQuestions} câu hỏi về Bình đẳng giới. Kết quả học hỏi của em:
                  </p>
                </div>
                {activityLogWarning && (
                  <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    {activityLogWarning}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <div className="text-xs font-bold text-blue-700 uppercase">Số câu đúng</div>
                    <div className="text-3xl font-black text-blue-900">
                      {quizResult.correctCount} / {quizResult.totalQuestions}
                    </div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-xl">
                    <div className="text-xs font-bold text-teal-700 uppercase">Tỷ lệ chính xác</div>
                    <div className="text-3xl font-black text-teal-900">
                      {quizResult.scorePercentage}%
                    </div>
                  </div>
                </div>

                {/* Per-topic mastery */}
                <div className="text-left space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Đánh giá theo 6 chủ đề:
                  </h4>
                  <div className="space-y-2">
                    {OFFICIAL_TOPICS.map((t) => {
                      const ts = quizResult.topicScores[t.id];
                      const pct = ts && ts.total > 0 ? Math.round((ts.correct / ts.total) * 100) : 0;
                      return (
                        <div key={t.id} className="text-xs space-y-1">
                          <div className="flex justify-between font-semibold text-slate-700">
                            <span>{t.title}</span>
                            <span>{ts?.correct || 0}/{ts?.total || 0} câu ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 flex justify-center gap-3">
                  <button
                    onClick={handleRestartQuiz}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Làm lại bài kiểm tra
                  </button>
                  <button
                    onClick={() => setActiveTab("stats")}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Xem lịch sử & Báo cáo lớp
                  </button>
                </div>
              </div>
            ) : questions.length > 0 ? (
              /* Quiz Player View */
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Question Card (3 columns) */}
                <div className="lg:col-span-3 space-y-4">
                  {(() => {
                    const q = questions[currentQuestionIndex];
                    if (!q) return null;
                    const evaluation = evaluatedAnswers[q.id];
                    const selected = userAnswers[q.id];

                    return (
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
                        {/* Question Metadata */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg">
                              Câu {currentQuestionIndex + 1} / {questions.length}
                            </span>
                            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                              {q.topicTitle}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-slate-400">
                            Mức độ: {q.difficulty}
                          </span>
                        </div>

                        {/* Question Title */}
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                          {q.question}
                        </h3>

                        {/* 4 Options */}
                        <div className="space-y-3">
                          {q.options.map((opt) => {
                            const isChosen = selected === opt.id;
                            let style = "border-slate-200 hover:border-blue-400 bg-white hover:bg-slate-50";

                            if (evaluation) {
                              if (opt.id === evaluation.correctOptionId) {
                                style = "border-emerald-500 bg-emerald-50 text-emerald-950 font-bold";
                              } else if (isChosen && !evaluation.isCorrect) {
                                style = "border-rose-400 bg-rose-50 text-rose-950 font-bold";
                              } else {
                                style = "border-slate-200 opacity-60 bg-slate-50";
                              }
                            } else if (isChosen) {
                              style = "border-blue-600 bg-blue-50 text-blue-900 font-bold";
                            }

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelectOption(q.id, opt.id)}
                                disabled={!!evaluation}
                                className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${style}`}
                              >
                                <span
                                  className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                    isChosen
                                      ? "bg-blue-600 text-white"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {opt.id}
                                </span>
                                <span className="text-xs sm:text-sm font-medium leading-relaxed">
                                  {opt.text}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Post-answer pedagogical explanation (revealed only after answering!) */}
                        {evaluation && (
                          <div
                            className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                              evaluation.isCorrect
                                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                : "bg-amber-50 border-amber-200 text-amber-900"
                            }`}
                          >
                            <div className="flex items-center gap-2 font-bold text-sm">
                              {evaluation.isCorrect ? (
                                <>
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                  <span>Chính xác! Em làm rất tốt.</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-5 h-5 text-amber-600" />
                                  <span>Chưa chính xác. Đáp án đúng là {evaluation.correctOptionId}.</span>
                                </>
                              )}
                            </div>
                            <p className="pt-1">{evaluation.explanation}</p>
                          </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Câu trước
                          </button>

                          {currentQuestionIndex < questions.length - 1 ? (
                            <button
                              type="button"
                              onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Câu tiếp theo</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleFinishQuiz}
                              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors cursor-pointer"
                            >
                              Hoàn thành & Xem kết quả
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Question Navigator (1 column) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Danh sách {questions.length} câu hỏi
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, idx) => {
                      const evalResult = evaluatedAnswers[q.id];
                      const isCurrent = idx === currentQuestionIndex;

                      let bg = "bg-slate-100 text-slate-700 hover:bg-slate-200";
                      if (evalResult) {
                        bg = evalResult.isCorrect
                          ? "bg-emerald-500 text-white font-bold"
                          : "bg-amber-500 text-white font-bold";
                      }
                      if (isCurrent) {
                        bg += " ring-2 ring-blue-600 ring-offset-1";
                      }

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setCurrentQuestionIndex(idx)}
                          className={`h-9 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${bg}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[11px] space-y-1 text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <span>Đúng</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                      <span>Chưa đúng</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-200 shrink-0" />
                      <span>Chưa trả lời</span>
                    </div>
                  </div>

                  {Object.keys(userAnswers).length > 0 && (
                    <button
                      type="button"
                      onClick={handleFinishQuiz}
                      className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Nộp bài ({Object.keys(userAnswers).length}/{questions.length})
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: 10 SITUATIONS */}
        {/* ========================================================= */}
        {activeTab === "situations" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                10 Tình Huống Thực Tế Ứng Xử Học Đường
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Rèn luyện kỹ năng phân tích và đưa ra quyết định văn minh, tôn trọng bạn bè
              </p>
            </div>

            <div className="space-y-4">
              {SITUATIONS_DATA.map((sit, idx) => (
                <div
                  key={sit.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-lg bg-purple-100 text-purple-800 text-xs font-bold">
                      Tình huống #{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {sit.category}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-base">
                    {sit.title}
                  </h3>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                    "{sit.story}"
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-600 uppercase">
                      Cách ứng xử đúng:
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-950 font-medium">
                      ✓ {sit.options.find((o) => o.isBest)?.text || sit.takeawayMessage}
                    </div>
                  </div>

                  {/* Pedagogical Guidance */}
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-blue-800">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Bài học nhận thức dành cho học sinh:</span>
                    </div>
                    <p>{sit.pedagogicalAdvice}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: ARTICLES */}
        {/* ========================================================= */}
        {activeTab === "articles" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Bài Viết & Phóng Sự Tuyên Truyền
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Các bài viết giáo dục đã được Hội đồng Nhà trường phê duyệt xuất bản
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col group"
                >
                  {art.coverImage ? (
                    <img
                      src={art.coverImage}
                      alt={art.title}
                      className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-44 bg-gradient-to-r from-blue-600 to-teal-500 flex items-center justify-center text-white">
                      <BookOpen className="w-10 h-10" />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {art.topicTitle}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors leading-snug">
                        {art.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2">{art.summary}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Tác giả: {art.author}</span>
                      <span className="font-bold text-blue-600 flex items-center gap-0.5">
                        Đọc tiếp <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: VIDEOS */}
        {/* ========================================================= */}
        {activeTab === "videos" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Rạp Chiếu Phim Học Đường & Video Tuyên Truyền
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Các phóng sự, phim ngắn và tiểu phẩm học sinh THCS Quảng Châu
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => setSelectedVideo(vid)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col group"
                >
                  <div className="relative w-full h-44 bg-slate-900 overflow-hidden flex items-center justify-center">
                    {vid.thumbnailUrl && (
                      <img
                        src={vid.thumbnailUrl}
                        alt={vid.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform opacity-80"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/90 text-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Video className="w-6 h-6 ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                        {vid.topicTitle}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-teal-600 transition-colors leading-snug">
                        {vid.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2">{vid.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Đoàn làm phim: {vid.presenter}</span>
                      <span className="font-bold text-teal-600">Xem video</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: GALLERY */}
        {/* ========================================================= */}
        {activeTab === "gallery" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Thư Viện Tranh Ảnh & Áp Phích Cổ Động
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Tác phẩm hội họa và thiết kế truyền thông vì bình đẳng giới của trường
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow group"
                >
                  <img
                    src={img.imageUrl}
                    alt={img.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="p-3 space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{img.title}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{img.caption}</p>
                    <p className="text-[10px] text-teal-600 font-semibold">Nguồn: {img.sourceCredit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: COMMITMENT */}
        {/* ========================================================= */}
        {activeTab === "commitment" && (
          <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-md space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-teal-500 text-white flex items-center justify-center shadow-md">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Cam Kết Hành Động Học Sinh
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Mỗi hành động tôn trọng và sẻ chia của em là một viên gạch xây dựng trường học hạnh phúc
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Họ và tên học sinh:</span>
                <span className="font-bold text-slate-900">{session.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chi đội:</span>
                <span className="font-bold text-slate-900">Lớp {session.className} · Khối {session.gradeLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Đơn vị:</span>
                <span className="font-bold text-slate-900">Trường THCS Quảng Châu, Nghệ An</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Những cam kết em quyết tâm thực hiện:
              </label>
              {[
                "Tôn trọng sự khác biệt, không trêu chọc hay kỳ thị bạn bè về giới tính",
                "Chủ động chia sẻ việc nhà với ông bà, cha mẹ mỗi ngày (quét nhà, nấu ăn, rửa bát)",
                "Ủng hộ bạn bè tự do theo đuổi ước mơ nghề nghiệp, STEM hay nghệ thuật",
                "Không im lặng trước các hành vi trêu chọc, bạo lực giới học đường",
                "Luôn dùng lời nói văn minh, tôn trọng và yêu thương trong giao tiếp",
              ].map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selectedCommitments.includes(item)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCommitments([...selectedCommitments, item]);
                      } else {
                        setSelectedCommitments(selectedCommitments.filter((c) => c !== item));
                      }
                    }}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="font-medium text-slate-800">{item}</span>
                </label>
              ))}
            </div>

            {signedCommitment ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm">
                  Đã Ký Cam Kết Thành Công!
                </h4>
                <p className="text-xs">
                  Cảm ơn em {session.fullName} đã chung tay xây dựng trường học bình đẳng, an toàn và hạnh phúc.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSignedCommitment(true)}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Ký Cam Kết Hành Động</span>
              </button>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: PERSONAL RESULTS & CLASS REPORT (NO LEADERBOARDS BY NAME) */}
        {/* ========================================================= */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Kết Quả Rèn Luyện Cá Nhân & Báo Cáo Lớp
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Theo dõi tiến độ nhận thức cá nhân và kết quả hoạt động chung của Lớp {session.className}
              </p>
            </div>

            {/* Privacy rule notice box */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold">Chính sách bảo mật quyền riêng tư học sinh:</p>
                <p className="mt-0.5">
                  • Hệ thống <strong>không công bố bảng xếp hạng theo tên</strong>, không cho phép xem kết quả cá nhân của học sinh khác.
                </p>
                <p>
                  • Điểm số và mức độ hoàn thành chỉ dùng làm <strong>thông tin tham khảo rèn luyện nhận thức</strong>, không dùng làm căn cứ đánh giá học lực hay hạnh kiểm.
                </p>
              </div>
            </div>

            {/* Class aggregate metrics */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Báo Cáo Hoạt Động Tổng Hợp Lớp {session.className}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-bold uppercase">Tỷ lệ tham gia</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{classStats.participationRate}%</div>
                  <div className="text-xs text-teal-600 mt-0.5">{classStats.participatedCount} / {classStats.totalStudentsInClass} học sinh đã tham gia</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-bold uppercase">Điểm trung bình chung</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{classStats.averageScorePercentage}%</div>
                  <div className="text-xs text-slate-500 mt-0.5">Mức độ hiểu bài chung của lớp</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-bold uppercase">Chủ đề lớp làm tốt nhất</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1">Sẻ chia việc nhà trong gia đình</div>
                  <div className="text-xs text-emerald-600 mt-0.5">Đạt tỷ lệ đúng 92%</div>
                </div>
              </div>
            </div>

            {/* My personal quiz history */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Lịch Sử Luyện Tập Của Em ({session.fullName})</span>
              </h3>

              {myHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">Em chưa tham gia thử thách kiến thức nào.</p>
                  <button
                    onClick={() => setActiveTab("quiz")}
                    className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Bắt đầu làm bài ngay
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Thời gian</th>
                        <th className="py-3 px-4">Số câu đúng</th>
                        <th className="py-3 px-4">Tỷ lệ chính xác</th>
                        <th className="py-3 px-4">Đánh giá sư phạm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 text-slate-500 font-mono">
                            {new Date(h.completedAt).toLocaleString("vi-VN")}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {h.correctCount} / {h.totalQuestions}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                                h.scorePercentage >= 80
                                  ? "bg-emerald-100 text-emerald-800"
                                  : h.scorePercentage >= 60
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {h.scorePercentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {h.scorePercentage >= 90
                              ? "🌟 Xuất sắc! Nhận thức bình đẳng giới rất vững vàng."
                              : h.scorePercentage >= 75
                              ? "👍 Rất tốt! Tiếp tục phát huy trong trường học và gia đình."
                              : "💪 Khá tốt! Hãy đọc thêm các bài viết để nắm chắc hơn nhé."}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  {selectedArticle.topicTitle}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  {selectedArticle.title}
                </h3>
                <p className="text-xs text-slate-500">Tác giả: {selectedArticle.author}</p>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {selectedArticle.coverImage && (
              <img
                src={selectedArticle.coverImage}
                alt={selectedArticle.title}
                className="w-full h-56 object-cover rounded-xl"
              />
            )}

            <div
              className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-xs sm:text-sm"
              dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
            />

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">
                  {selectedVideo.topicTitle}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {selectedVideo.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Video player embed or direct link */}
            <div className="aspect-video w-full rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center relative">
              {selectedVideo.youtubeId ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=0`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-white text-center p-4 space-y-2">
                  <Video className="w-10 h-10 mx-auto text-teal-400" />
                  <p className="text-xs">Đường dẫn video: {selectedVideo.videoUrl}</p>
                  <a
                    href={selectedVideo.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg"
                  >
                    <span>Mở video ngoài</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600">{selectedVideo.description}</p>
            <div className="text-[11px] text-slate-500">
              Đoàn làm phim: <strong>{selectedVideo.presenter}</strong>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
