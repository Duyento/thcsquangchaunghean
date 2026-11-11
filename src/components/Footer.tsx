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
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      {/* Upper Footer: Highlight Ribbon */}
      <div className="bg-gradient-to-r from-blue-900 via-teal-900 to-slate-900 border-b border-slate-800 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-teal-200 uppercase font-semibold tracking-wider">Đường dây nóng hỗ trợ học sinh</p>
              <p className="text-base font-bold text-white">Tổng đài Quốc gia 111 · Miễn phí cuộc gọi 24/7</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => handleNavClick("quiz")}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              Làm trắc nghiệm 30 câu
            </button>
            <button
              onClick={() => handleNavClick("commitment")}
              className="px-4 py-2 text-xs font-semibold text-teal-200 bg-teal-950 border border-teal-700/60 hover:bg-teal-900 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Heart className="w-4 h-4 text-teal-400" />
              Tạo thẻ cam kết
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
              <h3 className="text-lg font-bold text-white tracking-tight">
                TRƯỜNG THCS QUẢNG CHÂU, NGHỆ AN
              </h3>
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
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Chuyên mục</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => handleNavClick("home")} className="hover:text-teal-300 transition-colors">
                  1. Trang chủ
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("knowledge")} className="hover:text-teal-300 transition-colors">
                  2. Hiểu đúng về bình đẳng giới
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("situations")} className="hover:text-teal-300 transition-colors">
                  3. Góc tình huống – Em sẽ làm gì?
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("quiz")} className="hover:text-teal-300 transition-colors">
                  4. Thử thách bình đẳng giới (30 câu)
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("media")} className="hover:text-teal-300 transition-colors">
                  5. Góc lan tỏa & Sáng kiến
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("commitment")} className="hover:text-teal-300 transition-colors">
                  6. Em cam kết hành động
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Resources & Guidelines */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Tài liệu tham khảo</h4>
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
          Dự án: <span className="text-slate-300 font-semibold">BÌNH ĐẲNG GIỚI – KHÔNG GIỚI HẠN ƯỚC MƠ</span> · Thông điệp: <span className="text-teal-400 font-semibold">Tôn trọng sự khác biệt – Bình đẳng cơ hội – Cùng nhau phát triển</span>.
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
