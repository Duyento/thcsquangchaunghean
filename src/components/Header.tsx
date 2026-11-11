import { useState } from "react";
import { Menu, X, BookOpen, Compass, Award, HeartHandshake, Sparkles, Home, ShieldCheck, GraduationCap, Users, FileCheck2 } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAdmin: () => void;
  onOpenStudent: () => void;
  onOpenTeacher: () => void;
  onOpenTestRunner: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  onOpenAdmin,
  onOpenStudent,
  onOpenTeacher,
  onOpenTestRunner,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Trang chủ", icon: Home },
    { id: "knowledge", label: "Hiểu đúng", icon: Compass },
    { id: "situations", label: "Góc tình huống", icon: BookOpen },
    { id: "quiz", label: "Thử thách", icon: Award },
    { id: "media", label: "Góc lan tỏa", icon: Sparkles },
    { id: "commitment", label: "Em cam kết", icon: HeartHandshake },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Banner Notice - School Identity & Quick Portal Switches */}
      <div className="bg-gradient-to-r from-blue-800 via-teal-700 to-indigo-900 text-white text-xs py-1 px-4 font-medium tracking-wide">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold">Trường THCS Quảng Châu, Nghệ An</span>
            <span className="hidden sm:inline text-white/50">·</span>
            <span className="hidden sm:inline">Giáo dục Bình đẳng giới học đường</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              onClick={onOpenTestRunner}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-200 hover:text-white bg-amber-500/20 hover:bg-amber-500/40 px-2 py-0.5 rounded-md border border-amber-300/30 transition-colors cursor-pointer"
              title="Chạy 10 kịch bản kiểm thử Đợt 3"
            >
              <FileCheck2 className="w-3 h-3 text-amber-300" />
              <span>Kiểm Thử ĐỢT 3 (10 Bài)</span>
            </button>

            <button
              onClick={onOpenTeacher}
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-indigo-100 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              <Users className="w-3 h-3 text-indigo-300" />
              <span>Cổng Giáo Viên</span>
            </button>

            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-100 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3 h-3 text-teal-300" />
              <span>Cổng Quản Trị</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => handleNavClick("home")}
            className="flex items-center gap-3 text-left group shrink-0 focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-base tracking-wider">BĐG</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight group-hover:text-blue-700 transition-colors whitespace-nowrap">
                BÌNH ĐẲNG GIỚI
              </span>
              <span className="text-xs font-semibold text-teal-600 whitespace-nowrap">
                KHÔNG GIỚI HẠN ƯỚC MƠ
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action CTA & Mobile Trigger */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={onOpenStudent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-teal-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-teal-700 shadow-sm shadow-blue-500/25 transition-all whitespace-nowrap shrink-0 hover:shadow-md cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Cổng Học Sinh</span>
            </button>

            <button
              onClick={onOpenTeacher}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer"
              title="Dành cho Giáo viên bộ môn & GVCN"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Cổng GV</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenStudent();
              }}
              className="w-full py-2.5 px-3 text-center text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Cổng Học Sinh THCS Quảng Châu</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenTeacher();
                }}
                className="py-2.5 px-3 text-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cổng Giáo Viên</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdmin();
                }}
                className="py-2.5 px-3 text-center text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Cổng Quản Trị</span>
              </button>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTestRunner();
              }}
              className="w-full py-2 px-3 text-center text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Bảng Kiểm Thử ĐỢT 3 (10 Kịch Bản An Ninh)</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
