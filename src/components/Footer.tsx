import { Shield, Phone, Heart, ExternalLink, Award, GraduationCap, Users, FileCheck2 } from "lucide-react";

interface FooterProps {
  setActiveTab: (tab: string) => void;
  onOpenAdmin?: () => void;
  onOpenStudent?: () => void;
  onOpenTeacher?: () => void;
  onOpenTestRunner?: () => void;
}

export default function Footer({
  setActiveTab,
  onOpenAdmin,
  onOpenStudent,
  onOpenTeacher,
  onOpenTestRunner,
}: FooterProps) {
  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="border-t border-slate-200 bg-ink text-slate-300">
      {/* Upper Footer: Highlight Ribbon */}
      <div className="border-b border-white/15 bg-brand py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-white/80 font-semibold">Đường dây nóng hỗ trợ học sinh</p>
              <p className="text-base font-bold text-white">Tổng đài Quốc gia 111 · Miễn phí cuộc gọi 24/7</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handleNavClick("quiz")}
              className="px-4 py-2 text-xs font-semibold text-brand bg-white hover:bg-brand-light rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              Thử thách kiến thức
            </button>
            <button
              onClick={() => handleNavClick("commitment")}
              className="px-4 py-2 text-xs font-semibold text-white bg-white/10 border border-white/25 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Heart className="w-4 h-4 text-amber-200" />
              Cam kết hành động
            </button>
          </div>
        </div>
      </div>

      {/* Middle Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Unit & Identity */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500 text-white font-extrabold flex items-center justify-center text-sm">
                THCS
              </div>
              <div>
                <p className="text-sm font-extrabold text-white">BÌNH ĐẲNG GIỚI – KHÔNG GIỚI HẠN ƯỚC MƠ</p>
                <h3 className="text-xs font-semibold text-slate-300">Đơn vị thực hiện: Trường THCS Quảng Châu, Nghệ An</h3>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              Sản phẩm phục vụ sân chơi sáng tạo: <strong className="text-slate-200">"Thanh thiếu niên kiến tạo thay đổi vì bình đẳng giới thông qua sáng kiến và truyền thông số"</strong>. Nền tảng giáo dục tương tác mở, thân thiện, bảo vệ quyền lợi và chắp cánh ước mơ cho học sinh THCS.
            </p>
            <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
              <Shield className="w-4 h-4" />
              <span>Nền tảng giáo dục phi lợi nhuận · Không thu thập dữ liệu cá nhân · 100% Miễn phí</span>
            </div>
          </div>

          {/* Col 2: Categories Navigation */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">Khám phá</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => handleNavClick("home")} className="hover:text-teal-300 transition-colors">
                  1. Trang chủ
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("knowledge")} className="hover:text-white transition-colors">
                  Kiến thức bình đẳng giới
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("situations")} className="hover:text-white transition-colors">
                  Tình huống thực tế
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("quiz")} className="hover:text-white transition-colors">
                  Thử thách kiến thức
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("media")} className="hover:text-white transition-colors">
                  Thư viện và sáng kiến
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("commitment")} className="hover:text-white transition-colors">
                  Cam kết hành động
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Resources & Guidelines */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">Tài liệu tham khảo</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-1.5 hover:text-white transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Luật Bình đẳng giới số 73/2006</span>
              </li>
              <li className="flex items-center gap-1.5 hover:text-white transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Luật Trẻ em năm 2016</span>
              </li>
              <li className="flex items-center gap-1.5 hover:text-white transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Công ước CEDAW của Liên Hợp Quốc</span>
              </li>
              <li className="flex items-center gap-1.5 hover:text-white transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Mục tiêu Phát triển Bền vững SDG 5</span>
              </li>
              <li className="flex items-center gap-1.5 hover:text-white transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Sổ tay Giáo dục Kỹ năng sống THCS</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800 py-6 px-4 text-center text-xs text-slate-500">
        <p className="max-w-3xl mx-auto">
          Dự án: <span className="text-slate-300 font-semibold">BÌNH ĐẲNG GIỚI – KHÔNG GIỚI HẠN ƯỚC MƠ</span> · Thông điệp: <span className="text-amber-300 font-semibold">Tôn trọng sự khác biệt – Bình đẳng cơ hội – Cùng nhau phát triển</span>.
        </p>
        <p className="mt-1">
          Bản quyền nội dung giáo dục © 2026 Trường THCS Quảng Châu, Nghệ An.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
          {onOpenStudent && (
            <button
              onClick={onOpenStudent}
              className="text-teal-400 hover:text-white underline transition-colors cursor-pointer flex items-center gap-1 font-semibold"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Cổng Học Sinh</span>
            </button>
          )}
          {onOpenTeacher && (
            <button
              onClick={onOpenTeacher}
              className="text-indigo-400 hover:text-white underline transition-colors cursor-pointer flex items-center gap-1 font-semibold"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cổng Giáo Viên</span>
            </button>
          )}
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="text-slate-400 hover:text-teal-300 underline transition-colors cursor-pointer flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Cổng Quản Trị (Ban Giám Hiệu)</span>
            </button>
          )}
          {onOpenTestRunner && (
            <button
              onClick={onOpenTestRunner}
              className="text-amber-300 hover:text-amber-100 underline transition-colors cursor-pointer flex items-center gap-1 font-bold"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Bảng Kiểm Thử ĐỢT 3 (10 Kịch Bản An Ninh)</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
