import { useState } from "react";
import { adminService } from "../../services/adminService";
import { UserAccount, School } from "../../types/adminTypes";
import {
  Settings,
  Download,
  Upload,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  FileJson,
  KeyRound,
} from "lucide-react";

interface SettingsAndBackupTabProps {
  currentUser: UserAccount;
}

export default function SettingsAndBackupTab({ currentUser }: SettingsAndBackupTabProps) {
  const [school, setSchool] = useState<School>(adminService.getSchool());
  const [academicYear, setAcademicYear] = useState(school.academicYear);
  const [restoreJson, setRestoreJson] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isSuperAdmin = currentUser.role === "super_admin";

  const handleUpdateSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert("Chỉ Admin chính mới có quyền cập nhật thông tin nhà trường.");
      return;
    }
    const updated = adminService.updateSchool({ academicYear }, currentUser);
    setSchool(updated);
    setStatusMessage({ type: "success", text: "Đã cập nhật năm học thành công!" });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleExportBackup = () => {
    try {
      const backupStr = adminService.exportBackup(currentUser);
      const blob = new Blob([backupStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_thcs_quang_chau_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({ type: "success", text: "Đã xuất và tải về bản sao lưu an toàn của nhà trường!" });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Lỗi khi sao lưu dữ liệu." });
    }
  };

  const handleRestoreBackup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert("Chỉ Admin chính mới có quyền phục hồi dữ liệu hệ thống.");
      return;
    }
    if (!restoreJson.trim()) {
      setStatusMessage({ type: "error", text: "Vui lòng dán nội dung tệp JSON sao lưu." });
      return;
    }

    if (!confirm("CẢNH BÁO: Phục hồi sẽ ghi đè cơ sở dữ liệu quản trị hiện tại bằng dữ liệu trong bản sao lưu. Bạn có chắc chắn muốn tiếp tục?")) {
      return;
    }

    try {
      const res = adminService.restoreBackup(currentUser, restoreJson);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
        setRestoreJson("");
        setSchool(adminService.getSchool());
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage({ type: "error", text: res.message });
      }
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể xác minh Admin chính để phục hồi.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          <span>Cài Đặt Hệ Thống & Sao Lưu Dữ Liệu</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Quản lý thông tin nhà trường, năm học và các cơ chế sao lưu, phục hồi dữ liệu an toàn
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-teal-600" />
            <span>Thông Tin Đơn Vị</span>
          </h3>

          <form onSubmit={handleUpdateSchool} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Tên trường:</label>
              <input
                type="text"
                disabled
                value={school.name}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tỉnh / Thành:</label>
                <input
                  type="text"
                  disabled
                  value={school.province}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mã đơn vị:</label>
                <input
                  type="text"
                  disabled
                  value={school.code}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed font-mono font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Năm học áp dụng:</label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2025-2026"
                className={`w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold ${
                  !isSuperAdmin ? "bg-slate-50 text-slate-600 cursor-not-allowed" : "bg-white"
                }`}
              />
            </div>

            {isSuperAdmin && (
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
              >
                Cập Nhật Năm Học
              </button>
            )}
          </form>
        </div>

        {/* Backup Export */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              <span>Sao Lưu Toàn Bộ Dữ Liệu (Backup)</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tải về bản sao lưu dữ liệu trường, khối, lớp, giáo viên, học sinh, nội dung, kết quả học tập và nhật ký dưới dạng JSON.
            </p>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] space-y-1">
              <p className="font-bold">Lưu ý quan trọng về tài khoản:</p>
              <p>Backup thông thường không chứa tài khoản, passwordHash hoặc salt. Tài khoản hiện có sẽ không được phục hồi từ tệp này và được giữ nguyên khi restore.</p>
            </div>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={!isSuperAdmin}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FileJson className="w-4 h-4" />
            <span>Tải Xuống Bản Sao Lưu JSON (Toàn Trường)</span>
          </button>
        </div>
      </div>

      {/* Restore Section (Super Admin only) */}
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-purple-600" />
            <span>Phục Hồi Dữ Liệu Từ Bản Sao Lưu (Restore)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Dán JSON backup có phiên bản schema được hỗ trợ. Hệ thống kiểm tra toàn bộ cấu trúc trước khi ghi; nếu lỗi ghi, sẽ báo lỗi và cố gắng hoàn tác. Dữ liệu tài khoản không được phục hồi.
          </p>

          <form onSubmit={handleRestoreBackup} className="space-y-3">
            <textarea
              rows={4}
              value={restoreJson}
              onChange={(e) => setRestoreJson(e.target.value)}
              placeholder="Dán mã JSON bản sao lưu vào đây..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-slate-50/50"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!restoreJson.trim()}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>Kiểm Tra & Phục Hồi Dữ Liệu</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Phục Hồi Mật Khẩu Tài Khoản</span>
          </h3>
          <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            Chức năng hiện bị vô hiệu hóa. Hệ thống chưa có cách tin cậy để xác minh quyền sở hữu tài khoản đích; không có tài khoản nào được phục hồi hoặc thay đổi.
          </p>
        </div>
      )}
    </div>
  );
}
