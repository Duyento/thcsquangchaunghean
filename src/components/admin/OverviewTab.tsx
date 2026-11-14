import { useState, useEffect } from "react";
import { adminService } from "../../services/adminService";
import { contentService } from "../../services/contentService";
import { studentService } from "../../services/studentService";
import { UserAccount, SystemStats, ActivityLog, SchoolOverviewStats } from "../../types/adminTypes";
import { competitionService } from "../../services/competitionService";
import { Competition } from "../../types/competitionTypes";
import {
  Layers,
  School,
  Users,
  GraduationCap,
  ShieldAlert,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Building,
  HelpCircle,
  FileText,
  Video,
  Image as ImageIcon,
  CheckCheck,
  AlertTriangle,
  Download,
  BarChart3,
  Trophy,
} from "lucide-react";

interface OverviewTabProps {
  currentUser: UserAccount;
  onNavigateTab: (tabId: string) => void;
}

export default function OverviewTab({ currentUser, onNavigateTab }: OverviewTabProps) {
  const [stats, setStats] = useState<SystemStats>(adminService.getStats());
  const [contentStats, setContentStats] = useState(() => contentService.getContentStats());
  const [schoolStats, setSchoolStats] = useState<SchoolOverviewStats>(() => studentService.getSchoolOverviewStats());
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [competitionSummary, setCompetitionSummary] = useState<Competition[]>([]);
  const [competitionLoadError, setCompetitionLoadError] = useState("");
  const [exportNotice, setExportNotice] = useState<string>("");
  const school = adminService.getSchool();

  useEffect(() => {
    setStats(adminService.getStats());
    setContentStats(contentService.getContentStats());
    setSchoolStats(studentService.getSchoolOverviewStats());
    setRecentLogs(adminService.getActivityLogs(currentUser).slice(0, 6));
    if (currentUser.role === "super_admin") {
      try {
        const competitions = competitionService.getData(currentUser).competitions;
        setCompetitionSummary(competitions.filter((item) => item.status === "ongoing" || item.status === "ended").slice(0, 5));
        setCompetitionLoadError("");
      } catch (error) {
        setCompetitionLoadError(error instanceof Error ? error.message : "Không đọc được dữ liệu cuộc thi.");
      }
    } else {
      setCompetitionSummary([]);
      setCompetitionLoadError("");
    }
  }, [currentUser]);

  const handleExportStats = () => {
    studentService.exportSchoolStatsToExcel();
    setExportNotice("Đã xuất thành công tệp Excel thống kê toàn trường!");
    setTimeout(() => setExportNotice(""), 3500);
  };

  const schoolStatCards = [
    {
      title: "Tổng số Khối",
      value: stats.totalGrades,
      subtext: "Khối 6, 7, 8, 9",
      icon: Layers,
      color: "from-blue-600 to-indigo-600",
      tab: "grades",
    },
    {
      title: "Tổng số Lớp",
      value: stats.totalClasses,
      subtext: `${stats.activeClasses} lớp hoạt động`,
      icon: School,
      color: "from-teal-600 to-emerald-600",
      tab: "classes",
    },
    {
      title: "Tổng số Học sinh",
      value: stats.totalStudents,
      subtext: "Hồ sơ học sinh toàn trường",
      icon: GraduationCap,
      color: "from-sky-600 to-blue-700",
      tab: "students",
    },
    {
      title: "Tổng số Giáo viên",
      value: stats.totalTeachers,
      subtext: "Cán bộ GVCN & GV bộ môn",
      icon: Users,
      color: "from-amber-500 to-orange-600",
      tab: "teachers",
    },
    {
      title: "Admin Phụ",
      value: stats.totalSubAdmins,
      subtext: "Phân quyền theo chức năng",
      icon: ShieldAlert,
      color: "from-purple-600 to-indigo-700",
      tab: "accounts",
    },
  ];

  const contentStatCards = [
    {
      title: "Ngân hàng Câu hỏi",
      value: contentStats.totalQuestions,
      subtext: `${contentStats.publishedQuestions} câu đã xuất bản`,
      icon: HelpCircle,
      color: "from-indigo-600 to-blue-600",
      tab: "questions",
    },
    {
      title: "Bài viết Tuyên truyền",
      value: contentStats.totalPosts,
      subtext: `${contentStats.publishedPosts} bài đã xuất bản`,
      icon: FileText,
      color: "from-teal-600 to-cyan-600",
      tab: "posts",
    },
    {
      title: "Video Tuyên truyền",
      value: contentStats.totalVideos,
      subtext: `${contentStats.publishedVideos} video đã xuất bản`,
      icon: Video,
      color: "from-rose-600 to-red-600",
      tab: "videos",
    },
    {
      title: "Thư viện Hình ảnh",
      value: contentStats.totalImages,
      subtext: `${contentStats.publishedImages} ảnh đã xuất bản`,
      icon: ImageIcon,
      color: "from-amber-500 to-yellow-600",
      tab: "images",
    },
    {
      title: "Chờ Phê Duyệt",
      value: contentStats.pendingApprovals,
      subtext: contentStats.pendingApprovals > 0 ? "Cần Admin chính duyệt" : "Đã duyệt hết",
      icon: CheckCheck,
      color: contentStats.pendingApprovals > 0 ? "from-red-600 to-rose-700" : "from-emerald-600 to-teal-600",
      tab: "approval",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-teal-200 text-xs font-semibold backdrop-blur-md">
            <Building className="w-3.5 h-3.5" />
            <span>{school.name} · {school.province}</span>
            <span className="text-white/40">|</span>
            <span className="flex items-center gap-1 text-amber-300">
              <Calendar className="w-3.5 h-3.5" />
              Năm học {school.academicYear}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Chào mừng, {currentUser.fullName}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Hệ thống quản trị và giám sát sân chơi sáng tạo: <strong className="text-teal-300 font-bold">"Bình đẳng giới – Không giới hạn ước mơ"</strong>. Bạn đang đăng nhập với vai trò:{" "}
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold text-xs uppercase">
              {currentUser.role === "super_admin" ? "Admin chính (Toàn quyền)" : "Admin phụ"}
            </span>
          </p>
        </div>
      </div>

      {/* Approval Alert if items are waiting */}
      {contentStats.pendingApprovals > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-4 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950">
                Có {contentStats.pendingApprovals} nội dung đang chờ phê duyệt từ các tổ bộ môn!
              </p>
              <p className="text-xs text-amber-800">
                Bao gồm câu hỏi, bài viết hoặc video do giáo viên/Admin phụ đề xuất cần Admin chính thẩm định để xuất bản công khai.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab("approval")}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            Vào xét duyệt ngay →
          </button>
        </div>
      )}

      {/* SECTION 1: CƠ CẤU NHÀ TRƯỜNG & HỌC SINH */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <School className="w-4 h-4 text-sky-600" />
            <span>1. Cơ Cấu Nhà Trường & Học Sinh (Đợt 1)</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {schoolStatCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={() => onNavigateTab(card.tab)}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-teal-400 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-xs`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Chi tiết →</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      {card.title}
                    </p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                      {card.value}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-2.5 border-t border-slate-100 mt-2.5 truncate">
                  {card.subtext}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: KHO DỮ LIỆU & QUẢN LÝ NỘI DUNG (ĐỢT 2) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <span>2. Kho Dữ Liệu Giáo Dục & Truyền Thông (Đợt 2)</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {contentStatCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={() => onNavigateTab(card.tab)}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-xs`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Chi tiết →</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      {card.title}
                    </p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
                      {card.value}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-2.5 border-t border-slate-100 mt-2.5 truncate">
                  {card.subtext}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: THỐNG KÊ THAM GIA & KẾT QUẢ HỌC TẬP (TOÀN TRƯỜNG, KHỐI & LỚP) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>3. Thống Kê Tham Gia & Điểm Số (Toàn Trường, Khối & Lớp)</span>
          </h3>

          <button
            onClick={handleExportStats}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Báo Cáo Thống Kê (Excel)</span>
          </button>
        </div>

        {exportNotice && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* 4 Overview Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Lượt thi hoàn thành</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{schoolStats.totalAttempts}</p>
            <p className="text-[11px] text-slate-500 mt-1">Lượt nộp bài thử thách</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Học sinh đã tham gia</p>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">{schoolStats.uniqueParticipants} / {schoolStats.totalStudentsSchool}</p>
            <p className="text-[11px] text-slate-500 mt-1">Học sinh tích cực hưởng ứng</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tỷ lệ tham gia</p>
            <p className="text-2xl font-extrabold text-teal-600 mt-1">{schoolStats.overallParticipationRate}%</p>
            <p className="text-[11px] text-slate-500 mt-1">Toàn trường THCS Quảng Châu</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Điểm TB toàn trường</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{schoolStats.overallAverageScore}%</p>
            <p className="text-[11px] text-slate-500 mt-1">Đánh giá nhận thức xuất sắc</p>
          </div>
        </div>

        {/* Grade Breakdown & Class Breakdown Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Grade Breakdown Cards */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Thống Kê Theo 4 Khối</span>
              </h4>
              <span className="text-[11px] text-slate-400">Khối 6, 7, 8, 9</span>
            </div>

            <div className="space-y-3.5">
              {schoolStats.gradeStats.map((g) => (
                <div key={g.gradeLevel} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{g.gradeName} ({g.totalClasses} lớp)</span>
                    <span className="font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                      Điểm TB: {g.averageScorePercentage}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Tham gia: {g.participatedCount}/{g.totalStudents} HS</span>
                      <span className="font-semibold text-slate-700">{g.participationRate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, g.participationRate))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Class Breakdown Table */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-teal-600" />
                <span>Thống Kê Từng Lớp Học</span>
              </h4>
              <span className="text-[11px] text-slate-400">{schoolStats.classStats.length} lớp</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                    <th className="pb-2">Lớp</th>
                    <th className="pb-2">Khối</th>
                    <th className="pb-2">Sĩ số</th>
                    <th className="pb-2">Đã tham gia</th>
                    <th className="pb-2">Tỷ lệ %</th>
                    <th className="pb-2 text-right">Điểm TB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {schoolStats.classStats.map((c) => (
                    <tr key={c.classId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 font-bold text-slate-900">{c.className}</td>
                      <td className="py-2.5 text-slate-500">Khối {c.gradeLevel}</td>
                      <td className="py-2.5">{c.totalStudentsInClass}</td>
                      <td className="py-2.5 text-blue-600 font-semibold">{c.participatedCount} HS</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold text-[10px]">
                          {c.participationRate}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-600">
                        {c.averageScorePercentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {currentUser.role === "super_admin" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
              <Trophy className="h-4 w-4 text-amber-600" /> Cuộc thi đang diễn ra & đã kết thúc
            </h3>
            <button onClick={() => onNavigateTab("competitions")} className="text-xs font-bold text-blue-700">Quản lý cuộc thi →</button>
          </div>
          {competitionLoadError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{competitionLoadError}</p>
          ) : competitionSummary.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {competitionSummary.map((competition) => (
                <button key={competition.id} onClick={() => onNavigateTab("competitions")} className="rounded-xl border bg-white p-4 text-left shadow-sm hover:border-amber-400">
                  <p className="font-bold text-slate-900">{competition.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{competition.status === "ongoing" ? "Đang diễn ra" : "Đã kết thúc"} · {new Date(competition.endsAt).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          ) : (
            <button onClick={() => onNavigateTab("competitions")} className="w-full rounded-xl border border-dashed bg-white p-4 text-left text-sm text-slate-500">
              Chưa có cuộc thi đang diễn ra hoặc đã kết thúc. Mở quản lý cuộc thi →
            </button>
          )}
        </section>
      )}

      {/* Quick Action Matrix & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Actions Shortcuts */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Lối tắt Quản trị</span>
            <span className="text-xs text-slate-500 font-normal">Thao tác nhanh</span>
          </h3>

          <div className="space-y-2.5">
            <button
              onClick={() => onNavigateTab("classes")}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/30 text-left transition-all flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                  <School className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 group-hover:text-teal-700">Quản lý lớp học & GVCN</p>
                  <p className="text-xs text-slate-500">Tạo mới, gán giáo viên, cập nhật sĩ số</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigateTab("students")}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 text-left transition-all flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700">Chuyển lớp học sinh</p>
                  <p className="text-xs text-slate-500">Cập nhật hồ sơ và điều chuyển lớp</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            {currentUser.role === "super_admin" && (
              <button
                onClick={() => onNavigateTab("accounts")}
                className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/30 text-left transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-purple-700">Tạo & phân quyền Admin phụ</p>
                    <p className="text-xs text-slate-500">Cấp quyền 9 phân hệ chức năng</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            <button
              onClick={() => onNavigateTab("settings")}
              className="w-full p-3.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 text-left transition-all flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 group-hover:text-amber-700">Sao lưu dữ liệu hệ thống</p>
                  <p className="text-xs text-slate-500">Xuất snapshot JSON an toàn</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Nhật Ký Quản Trị Gần Đây</span>
            </h3>
            <button
              onClick={() => onNavigateTab("logs")}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              Xem tất cả →
            </button>
          </div>

          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có nhật ký hoạt động nào.</p>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{log.actorName}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {log.actorRole === "super_admin" ? "Admin chính" : "Admin phụ"}
                      </span>
                    </div>
                    <p className="text-slate-600 font-medium">{log.details}</p>
                  </div>
                  <span className="text-slate-400 shrink-0 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
