import { useState } from "react";
import { adminService } from "../../services/adminService";
import { UserAccount, AdminPermission, Grade } from "../../types/adminTypes";
import AdminLogin from "./AdminLogin";
import OverviewTab from "./OverviewTab";
import GradesTab from "./GradesTab";
import ClassesTab from "./ClassesTab";
import TeachersTab from "./TeachersTab";
import StudentsTab from "./StudentsTab";
import AccountsAndPermissionsTab from "./AccountsAndPermissionsTab";
import ActivityLogsTab from "./ActivityLogsTab";
import SettingsAndBackupTab from "./SettingsAndBackupTab";
import QuestionsTab from "./QuestionsTab";
import PostsTab from "./PostsTab";
import VideosTab from "./VideosTab";
import ImagesTab from "./ImagesTab";
import ApprovalWorkflowTab from "./ApprovalWorkflowTab";
import CompetitionsTab from "./CompetitionsTab";
import {
  LayoutDashboard,
  Layers,
  School,
  GraduationCap,
  Users,
  ShieldCheck,
  ClipboardList,
  Settings,
  LogOut,
  ArrowLeft,
  Crown,
  Shield,
  Menu,
  X,
  Lock,
  ExternalLink,
  HelpCircle,
  FileText,
  Video,
  Image as ImageIcon,
  CheckCheck,
  Trophy,
} from "lucide-react";

interface AdminPortalProps {
  onBackToPublic: () => void;
  currentUser: UserAccount | null;
  authLoading: boolean;
  authError?: string;
  onLoginSuccess: (user: UserAccount) => void;
  onLogout: () => Promise<void>;
}

export default function AdminPortal({
  onBackToPublic,
  currentUser,
  authLoading,
  authError,
  onLoginSuccess,
  onLogout,
}: AdminPortalProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedGradeScope, setSelectedGradeScope] = useState<Grade | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    try {
      setLogoutError("");
      await onLogout();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Không thể kết thúc phiên Firebase Auth.");
    }
  };

  // If not logged in, render AdminLogin view
  if (!currentUser) {
    if (authLoading) {
      return <div className="min-h-[80vh] grid place-items-center text-sm text-slate-600">Đang khôi phục phiên Firebase Auth...</div>;
    }
    return (
      <AdminLogin
        onLoginSuccess={onLoginSuccess}
        onBackToPublic={onBackToPublic}
        authError={logoutError || authError}
      />
    );
  }

  // Navigation menu definitions with permission requirements
  interface NavItem {
    id: string;
    label: string;
    group: string;
    icon: typeof LayoutDashboard;
    permission?: AdminPermission;
    superAdminOnly?: boolean;
    badge?: string;
  }

  const navItems: NavItem[] = [
    {
      id: "overview",
      label: "Tổng quan",
      group: "Trường học",
      icon: LayoutDashboard,
    },
    {
      id: "grades",
      label: "Khối học",
      group: "Trường học",
      icon: Layers,
    },
    {
      id: "classes",
      label: "Lớp học",
      group: "Trường học",
      icon: School,
      permission: "manage_classes",
    },
    {
      id: "teachers",
      label: "Giáo viên",
      group: "Trường học",
      icon: GraduationCap,
      permission: "manage_teachers",
    },
    {
      id: "students",
      label: "Học sinh",
      group: "Trường học",
      icon: Users,
      permission: "manage_students",
    },
    {
      id: "questions",
      label: "Ngân hàng câu hỏi",
      group: "Học liệu",
      icon: HelpCircle,
      permission: "manage_questions",
    },
    {
      id: "posts",
      label: "Bài viết",
      group: "Học liệu",
      icon: FileText,
      permission: "manage_posts",
    },
    {
      id: "videos",
      label: "Video",
      group: "Học liệu",
      icon: Video,
      permission: "manage_videos",
    },
    {
      id: "images",
      label: "Hình ảnh",
      group: "Học liệu",
      icon: ImageIcon,
      permission: "manage_images",
    },
    {
      id: "approval",
      label: "Phê duyệt nội dung",
      group: "Học liệu",
      icon: CheckCheck,
      superAdminOnly: true,
      badge: "Duyệt",
    },
    {
      id: "competitions",
      label: "Cuộc thi",
      group: "Hệ thống",
      icon: Trophy,
      superAdminOnly: true,
      badge: "Super Admin",
    },
    {
      id: "accounts",
      label: "Tài khoản và quyền",
      group: "Hệ thống",
      icon: ShieldCheck,
      superAdminOnly: true,
      badge: "Admin chính",
    },
    {
      id: "logs",
      label: "Nhật ký hoạt động",
      group: "Hệ thống",
      icon: ClipboardList,
      permission: "view_reports",
    },
    {
      id: "settings",
      label: "Cài đặt và sao lưu",
      group: "Hệ thống",
      icon: Settings,
      superAdminOnly: true,
      badge: "Admin chính",
    },
  ];


  // Helper check if current user can view a specific tab
  const canAccessTab = (item: NavItem): boolean => {
    if (currentUser.role === "super_admin") return true;
    if (item.superAdminOnly) return false;
    if (!item.permission) return true;
    return adminService.hasPermission(currentUser, item.permission);
  };

  const activeNavItem = navItems.find((n) => n.id === activeTab) || navItems[0];
  const hasAccessToCurrentTab = canAccessTab(activeNavItem);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans">
      {logoutError && (
        <div role="alert" className="fixed top-3 right-3 z-50 max-w-md rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 shadow">
          {logoutError}
        </div>
      )}
      {/* Mobile Top Header */}
      <div className="md:hidden bg-ink text-white p-4 flex items-center justify-between sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
              QC
            </div>
            <div>
              <p className="font-bold text-xs leading-none">THCS Quảng Châu</p>
              <p className="text-[10px] text-slate-400">Cổng Quản Trị</p>
            </div>
          </div>
        </div>
        <button
          onClick={onBackToPublic}
          className="text-xs flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1.5 rounded-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Học sinh</span>
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-ink text-white flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white font-extrabold text-base shadow-md">
              QC
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white leading-tight">
                THCS QUẢNG CHÂU
              </h1>
              <p className="text-xs text-teal-400 font-medium">Cổng Quản Trị Nhà Trường</p>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${
                  currentUser.role === "super_admin"
                    ? "bg-gradient-to-br from-amber-500 to-amber-700 shadow-md shadow-amber-500/20"
                    : "bg-gradient-to-br from-blue-500 to-teal-600"
                }`}
              >
                {currentUser.fullName.charAt(0).toUpperCase()}
              </div>
              {currentUser.role === "super_admin" ? (
                <div
                  title="Admin Chính"
                  className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full ring-2 ring-slate-900"
                >
                  <Crown className="w-3 h-3" />
                </div>
              ) : (
                <div
                  title="Admin Phụ"
                  className="absolute -top-1 -right-1 bg-teal-400 text-slate-950 p-0.5 rounded-full ring-2 ring-slate-900"
                >
                  <Shield className="w-3 h-3" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{currentUser.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    currentUser.role === "super_admin"
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                      : "bg-teal-400/20 text-teal-300 border border-teal-400/30"
                  }`}
                >
                  {currentUser.role === "super_admin" ? "Admin Chính" : "Admin Phụ"}
                </span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 truncate mt-2 font-mono">
            {currentUser.email}
          </p>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const allowed = canAccessTab(item);

            return (
              <div key={item.id}>
                {(index === 0 || navItems[index - 1].group !== item.group) && (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase text-slate-400">
                    {item.group}
                  </p>
                )}
                <button
                  onClick={() => {
                    if (item.id !== "classes") setSelectedGradeScope(null);
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-colors text-left ${
                    isActive
                      ? "bg-brand text-white font-semibold shadow-sm"
                      : allowed
                      ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                      : "text-slate-500 hover:bg-slate-800/50 cursor-not-allowed opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium shrink-0">
                      {item.badge}
                    </span>
                  )}
                  {!allowed && (
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={onBackToPublic}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về giao diện học sinh</span>
            <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất phiên làm việc</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Bar for Desktop */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-30 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>{activeNavItem.label}</span>
              {activeNavItem.superAdminOnly && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                  Chỉ dành cho Admin chính
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Trường THCS Quảng Châu – Năm học 2024-2025 · Phiên làm việc bảo mật
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToPublic}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Xem trang học sinh</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Tab Body */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          {!hasAccessToCurrentTab ? (
            <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 p-8 text-center shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Không đủ quyền truy cập
              </h3>
              <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                Tài khoản <span className="font-semibold text-slate-800">{currentUser.fullName}</span>{" "}
                (Admin Phụ) chưa được Admin chính cấp quyền truy cập mục{" "}
                <span className="font-semibold text-rose-700">"{activeNavItem.label}"</span>.
                Vui lòng liên hệ Admin chính của Trường THCS Quảng Châu để được phân quyền.
              </p>
              <button
                onClick={() => setActiveTab("overview")}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Quay về Tổng quan</span>
              </button>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  currentUser={currentUser}
                  onNavigateTab={(tabId) => setActiveTab(tabId)}
                />
              )}
              {activeTab === "grades" && (
                <GradesTab
                  currentUser={currentUser}
                  onSelectGrade={(grade) => {
                    setSelectedGradeScope(grade);
                    setActiveTab("classes");
                  }}
                />
              )}
              {activeTab === "classes" && (
                <ClassesTab currentUser={currentUser} initialGradeFilter={selectedGradeScope ?? undefined} />
              )}
              {activeTab === "teachers" && (
                <TeachersTab currentUser={currentUser} />
              )}
              {activeTab === "students" && (
                <StudentsTab currentUser={currentUser} />
              )}
              {activeTab === "questions" && (
                <QuestionsTab currentUser={currentUser} />
              )}
              {activeTab === "posts" && (
                <PostsTab currentUser={currentUser} />
              )}
              {activeTab === "videos" && (
                <VideosTab currentUser={currentUser} />
              )}
              {activeTab === "images" && (
                <ImagesTab currentUser={currentUser} />
              )}
              {activeTab === "approval" && (
                <ApprovalWorkflowTab currentUser={currentUser} />
              )}
              {activeTab === "competitions" && (
                <CompetitionsTab currentUser={currentUser} />
              )}
              {activeTab === "accounts" && (
                <AccountsAndPermissionsTab currentUser={currentUser} />
              )}
              {activeTab === "logs" && (
                <ActivityLogsTab currentUser={currentUser} />
              )}
              {activeTab === "settings" && (
                <SettingsAndBackupTab currentUser={currentUser} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Backdrop for mobile sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-xs"
        />
      )}
    </div>
  );
}
