import { useState } from "react";
import { getAdminAuthService } from "../../services/firebaseAdminAuthService";
import { UserAccount } from "../../types/adminTypes";
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowLeft } from "lucide-react";

interface AdminLoginProps {
  onLoginSuccess: (user: UserAccount) => void;
  onBackToPublic: () => void;
  authError?: string;
}

export default function AdminLogin({ onLoginSuccess, onBackToPublic, authError }: AdminLoginProps) {
  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsSubmitting(true);

    try {
      const user = await getAdminAuthService().signIn(email, password);
      setPassword("");
      onLoginSuccess(user);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Không thể xác thực qua Firebase Auth.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Return to Public Website */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <button
          onClick={onBackToPublic}
          className="text-xs font-bold text-slate-600 hover:text-blue-700 flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang học sinh</span>
        </button>
        <span className="text-xs font-semibold text-slate-500">
          THCS Quảng Châu · Nghệ An
        </span>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-blue-900 via-teal-900 to-slate-900 text-white p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            CỔNG QUẢN TRỊ NHÀ TRƯỜNG
          </h2>
          <p className="text-xs text-teal-200">
            Trường THCS Quảng Châu, Nghệ An · Hệ thống quản lý giáo dục
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Đăng Nhập Quản Trị Viên
              </h3>
              <p className="text-xs text-slate-500">
                Dành cho Admin chính, Admin phụ và Giáo viên được cấp quyền
              </p>
            </div>

            {(loginError || authError) && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError || authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email quản trị:</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.test"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mật khẩu:</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Phiên đăng nhập: chỉ trong tab hiện tại</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Đang xác thực..." : "Đăng Nhập Quản Trị"}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowRecoveryInfo((visible) => !visible)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer"
              >
                {showRecoveryInfo ? "Đóng hướng dẫn khôi phục" : "Quên mật khẩu?"}
              </button>
            </div>

            {showRecoveryInfo && (
              <div
                role="status"
                className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2"
              >
                <p className="font-bold">Khôi phục trực tuyến chưa được kích hoạt.</p>
                <p>
                  Ứng dụng chưa có máy chủ xác minh độc lập để cấp lại mật khẩu an toàn. Hãy liên hệ Ban Giám Hiệu hoặc đơn vị quản lý trường qua kênh chính thức đã biết để xác minh danh tính và được hướng dẫn.
                </p>
                <p>
                  Không gửi mật khẩu hiện tại, mã xác minh hoặc thông tin credential cho người hỗ trợ. Màn hình này không gửi yêu cầu, không thay đổi tài khoản và không tạo tài khoản mới.
                </p>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>
                Chỉ tài khoản đã tồn tại, đang hoạt động và có thông tin xác thực hợp lệ mới đăng nhập được. Màn hình này không tạo hoặc khôi phục tài khoản.
              </p>
            </div>
          </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
          Chỉ dành riêng cho nhân sự có thẩm quyền của Trường THCS Quảng Châu.
        </div>
      </div>
    </div>
  );
}
