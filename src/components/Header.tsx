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
    { id: "knowledge", label: "Kiến thức bình đẳng giới", icon: Compass },
    { id: "situations", label: "Tình huống thực tế", icon: BookOpen },
    { id: "quiz", label: "Thử thách kiến thức", icon: Award },
    { id: "media", label: "Thư viện và sáng kiến", icon: Sparkles },
    { id: "commitment", label: "Cam kết hành động", icon: HeartHandshake },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => handleNavClick("home")}
          className="group flex min-w-0 items-center gap-2.5 text-left"
          aria-label="Về Trang chủ"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-extrabold text-white">
            BĐG
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-extrabold leading-tight text-ink sm:text-base">
              BÌNH ĐẲNG GIỚI
            </span>
            <span className="truncate text-[11px] font-semibold leading-tight text-brand sm:text-xs">
              KHÔNG GIỚI HẠN ƯỚC MƠ
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onOpenStudent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-dark sm:text-sm"
          >
            <GraduationCap className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Cổng Học sinh</span>
            <span className="sm:hidden">Học sinh</span>
          </button>
          <button
            onClick={onOpenTeacher}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-ink hover:bg-surface 2xl:inline-flex"
          >
            <Users className="size-4 text-brand" aria-hidden="true" />
            Giáo viên
          </button>
          <button
            onClick={onOpenAdmin}
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-ink hover:bg-surface 2xl:inline-flex"
          >
            <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
            Quản trị
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-ink 2xl:hidden"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div className="hidden border-t border-slate-100 bg-surface px-4 py-2 2xl:block">
        <nav className="mx-auto flex max-w-7xl items-center justify-center gap-1 sm:px-2 lg:px-4" aria-label="Menu chính">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors xl:px-2.5 xl:text-sm ${
                  isActive ? "bg-brand-light text-brand" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-lg 2xl:hidden">
          <nav className="mx-auto max-w-7xl space-y-1" aria-label="Menu chính">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                    isActive ? "bg-brand-light text-brand" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mx-auto mt-3 grid max-w-7xl grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <button onClick={() => { setMobileMenuOpen(false); onOpenTeacher(); }} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-ink">
              <Users className="size-4 text-brand" aria-hidden="true" /> Giáo viên
            </button>
            <button onClick={() => { setMobileMenuOpen(false); onOpenAdmin(); }} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-ink">
              <ShieldCheck className="size-4 text-brand" aria-hidden="true" /> Quản trị
            </button>
            <button onClick={() => { setMobileMenuOpen(false); onOpenTestRunner(); }} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              <FileCheck2 className="size-4" aria-hidden="true" /> Công cụ kiểm thử
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
