import { useState, useEffect } from "react";
import { studentService } from "../../services/studentService";
import { adminService } from "../../services/adminService";
import { SchoolClass, StudentSession } from "../../types/adminTypes";
import {
  GraduationCap,
  Lock,
  User,
  Layers,
  KeyRound,
  AlertCircle,
  Clock,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  Info,
} from "lucide-react";

interface StudentLoginProps {
  onLoginSuccess: (session: StudentSession) => void;
  onBackToPublic: () => void;
}

export default function StudentLogin({ onLoginSuccess, onBackToPublic }: StudentLoginProps) {
  const [fullName, setFullName] = useState("");
  const [gradeLevel, setGradeLevel] = useState<6 | 7 | 8 | 9>(6);
  const [classId, setClassId] = useState<string>("");
  const [accessCode, setAccessCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rate limiting state
  const [rateLimitState, setRateLimitState] = useState(() => studentService.getRateLimitState());
  const [countdown, setCountdown] = useState(rateLimitState.remainingSeconds);

  // Available classes for selected grade
  const allClasses = adminService.getClasses();
  const availableClasses = allClasses.filter(
    (c) => c.gradeLevel === gradeLevel && c.status !== "archived"
  );

  // Set default classId when gradeLevel changes
  useEffect(() => {
    if (availableClasses.length > 0) {
      if (!availableClasses.some((c) => c.id === classId)) {
        setClassId(availableClasses[0].id);
      }
    } else {
      setClassId("");
    }
  }, [gradeLevel, availableClasses]);

  // Countdown timer for rate limiting
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (rateLimitState.isLocked && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setRateLimitState(studentService.getRateLimitState());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [rateLimitState.isLocked, countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Check rate limit lock
    const currentRate = studentService.getRateLimitState();
    if (currentRate.isLocked) {
      setRateLimitState(currentRate);
      setCountdown(currentRate.remainingSeconds);
      setError(`Bạn đã thử sai quá 5 lần. Vui lòng chờ ${currentRate.remainingSeconds} giây trước khi thử lại!`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await studentService.login(fullName, gradeLevel, classId, accessCode);
      if (res.success && res.session) {
        onLoginSuccess(res.session);
      } else {
        const updatedRate = studentService.getRateLimitState();
        setRateLimitState(updatedRate);
        setCountdown(updatedRate.remainingSeconds);
        setError(res.error || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Đã xảy ra sự cố trong quá trình xác thực. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (name: string, grade: 6 | 7 | 8 | 9, clsId: string, code: string) => {
    setFullName(name);
    setGradeLevel(grade);
    setClassId(clsId);
    setAccessCode(code);
    setError("");
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Top back navigation */}
      <div className="w-full max-w-lg mb-4 flex justify-between items-center">
        <button
          onClick={onBackToPublic}
          className="text-xs font-bold text-slate-600 hover:text-blue-700 flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang chủ chung</span>
        </button>
        <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
          THCS Quảng Châu · Nghệ An
        </span>
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-blue-700 via-teal-600 to-blue-800 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-14 h-14 mx-auto mb-3 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
            <GraduationCap className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">CỔNG HỌC SINH</h1>
          <p className="text-xs sm:text-sm text-teal-100 font-medium mt-1">
            Không gian học tập & rèn luyện Bình đẳng giới – THCS Quảng Châu
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Rate limiting lockout banner */}
          {rateLimitState.isLocked && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold">Đăng nhập bị tạm khóa an ninh ({rateLimitState.failedAttempts} lần thử sai)</p>
                <p className="mt-0.5">
                  Để bảo vệ an toàn cho lớp học, vui lòng đợi <strong>{countdown} giây</strong> trước khi thử lại.
                </p>
              </div>
            </div>
          )}

          {/* Validation error alert */}
          {error && !rateLimitState.isLocked && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold">Không thể đăng nhập</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Họ và tên */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                1. Họ và tên học sinh <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Hoàng Nam"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={rateLimitState.isLocked || isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-medium text-slate-800 placeholder-slate-400 transition-all disabled:bg-slate-100"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Nhập đầy đủ họ tên có dấu như trong danh sách lớp.
              </p>
            </div>

            {/* 2 & 3. Khối & Lớp */}
            <div className="grid grid-cols-2 gap-3">
              {/* Khối */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Khối <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(Number(e.target.value) as any)}
                    disabled={rateLimitState.isLocked || isSubmitting}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-800 bg-white transition-all disabled:bg-slate-100"
                  >
                    <option value={6}>Khối 6</option>
                    <option value={7}>Khối 7</option>
                    <option value={8}>Khối 8</option>
                    <option value={9}>Khối 9</option>
                  </select>
                </div>
              </div>

              {/* Lớp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Lớp học <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    disabled={rateLimitState.isLocked || isSubmitting}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-800 bg-white transition-all disabled:bg-slate-100"
                  >
                    {availableClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.status === "locked" ? "(Đã khóa)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Mã lớp dùng chung */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  4. Mã lớp dùng chung <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-teal-600 font-semibold flex items-center gap-1">
                  <Info className="w-3 h-3" /> Do GVCN cấp
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showCode ? "text" : "password"}
                  required
                  placeholder="Ví dụ: QC6A1"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  disabled={rateLimitState.isLocked || isSubmitting}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-mono font-bold text-slate-800 placeholder-slate-400 transition-all disabled:bg-slate-100 uppercase"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={rateLimitState.isLocked || isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-teal-600 to-blue-700 hover:from-blue-700 hover:to-teal-700 shadow-md shadow-blue-500/25 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? "Đang xác thực lớp học..." : "Vào Cổng Học Sinh"}</span>
            </button>
          </form>

          {/* Quick Demo Fill Helper for Testers */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Gợi ý thử nghiệm nhanh (Học sinh mẫu):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill("Nguyễn Hoàng Nam", 6, "class-6a1", "QC6A1")}
                className="p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-blue-900">Nguyễn Hoàng Nam (6A1)</div>
                <div className="text-[11px] text-blue-700">Mã: QC6A1 · Khối 6</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("Trần Khánh Linh", 6, "class-6a1", "QC6A1")}
                className="p-2.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-teal-900">Trần Khánh Linh (6A1)</div>
                <div className="text-[11px] text-teal-700">Mã: QC6A1 · Khối 6</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("Hoàng Diệu Linh", 8, "class-8c1", "QC8C1")}
                className="p-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-purple-900">Hoàng Diệu Linh (8C1)</div>
                <div className="text-[11px] text-purple-700">Mã: QC8C1 · Khối 8</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("Phạm Quỳnh Anh", 6, "class-6a1", "QC6A1")}
                className="p-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-left transition-colors cursor-pointer"
                title="Tài khoản bị khóa để thử nghiệm kịch bản 5"
              >
                <div className="font-bold text-rose-900">Phạm Quỳnh Anh (Đã khóa)</div>
                <div className="text-[11px] text-rose-700">Thử lỗi tài khoản bị khóa</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Pedagogical Disclaimer Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            Quy định an ninh & nguyên tắc sư phạm:
          </p>
          <p>
            • Mã lớp dùng chung là phương thức truy cập học tập thuận tiện. Danh tính cá nhân không được xem là định danh mạnh.
          </p>
          <p>
            • Kết quả làm bài chỉ mang tính chất tham khảo rèn luyện, <strong>không công bố bảng xếp hạng theo tên</strong> và <strong>không dùng để đánh giá xếp loại học sinh</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
