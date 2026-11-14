import { useEffect, useState } from "react";
import { adminService, BACKUP_SCHEMA_VERSION } from "../../services/adminService";
import { UserAccount, School } from "../../types/adminTypes";
import { createBackupFilename } from "../../services/secureBackup";
import {
  indexedDbBackupArchive,
  saveBackupToArchive,
  verifyArchivedBackup,
  type BackupArchiveRecord,
} from "../../services/backupArchive";
import {
  listRecoverableStorageStages,
  recoverStorageStage,
  rollbackStorageStage,
  type StorageStageSummary,
} from "../../services/academicYearSync";
import MigrationPreviewPanel from "./MigrationPreviewPanel";
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
  const [backupPassword, setBackupPassword] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [stageRecoveryPassword, setStageRecoveryPassword] = useState("");
  const [recoverableStages, setRecoverableStages] = useState<StorageStageSummary[]>([]);
  const [savedBackups, setSavedBackups] = useState<BackupArchiveRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isSuperAdmin = currentUser.role === "super_admin";

  useEffect(() => {
    if (!isSuperAdmin) return;
    try {
      setRecoverableStages(listRecoverableStorageStages(window.localStorage));
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể đọc journal staging.",
      });
    }
  }, [isSuperAdmin]);

  const refreshSavedBackups = async () => {
    setSavedBackups(
      (await indexedDbBackupArchive.getAll())
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    );
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    void indexedDbBackupArchive.getAll()
      .then((backups) => {
        if (active) {
          setSavedBackups(backups.sort((left, right) => right.timestamp.localeCompare(left.timestamp)));
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setStatusMessage({
            type: "error",
            text: error instanceof Error ? error.message : "Không thể đọc kho backup nội bộ.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  const handleRecoverStage = async (stageId: string) => {
    try {
      const stage = await recoverStorageStage(
        window.localStorage,
        stageId,
        stageRecoveryPassword
      );
      await rollbackStorageStage(window.localStorage, stage);
      setRecoverableStages(listRecoverableStorageStages(window.localStorage));
      setStageRecoveryPassword("");
      setStatusMessage({ type: "success", text: "Đã phục hồi và rollback staging; dữ liệu trước staging đã được xác minh." });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể phục hồi staging an toàn.",
      });
    }
  };

  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert("Chỉ Admin chính mới có quyền cập nhật thông tin nhà trường.");
      return;
    }
    try {
      const updated = await adminService.updateSchool({ academicYear }, currentUser);
      setSchool(updated);
      setStatusMessage({ type: "success", text: "Đã cập nhật năm học thành công!" });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể cập nhật năm học.",
      });
    }
  };

  const handleExportBackup = async () => {
    try {
      if (backupPassword.length < 12) {
        throw new Error("Mật khẩu backup phải có ít nhất 12 ký tự.");
      }
      const backupStr = await adminService.exportBackup(currentUser, backupPassword);
      const blob = new Blob([backupStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = createBackupFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setBackupPassword("");
      setStatusMessage({ type: "success", text: "Đã tải backup mã hóa. Hãy lưu mật khẩu riêng; tệp có thể chứa dữ liệu cá nhân và mã truy cập lớp." });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Lỗi khi sao lưu dữ liệu." });
    }
  };

  const handleSaveInternalBackup = async () => {
    try {
      if (backupPassword.length < 12) {
        throw new Error("Mật khẩu backup phải có ít nhất 12 ký tự.");
      }
      const content = await adminService.exportBackup(currentUser, backupPassword);
      const saved = await saveBackupToArchive(content, BACKUP_SCHEMA_VERSION);
      await refreshSavedBackups();
      setBackupPassword("");
      setStatusMessage({ type: "success", text: `Đã lưu backup mã hóa nội bộ với ID ${saved.id}. Backup cũ không bị ghi đè hoặc tự động xóa.` });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể lưu backup nội bộ.",
      });
    }
  };

  const handleRestoreArchivedBackup = async (backupId: string) => {
    if (!restorePassword || restorePassword.length < 12) {
      setStatusMessage({ type: "error", text: "Nhập mật khẩu backup hợp lệ trước khi phục hồi." });
      return;
    }
    if (!confirm("CẢNH BÁO: Phục hồi sẽ ghi đè cơ sở dữ liệu quản trị hiện tại bằng dữ liệu trong bản sao lưu. Bạn có chắc chắn muốn tiếp tục?")) {
      return;
    }
    try {
      const backup = await indexedDbBackupArchive.get(backupId);
      if (!backup) throw new Error("Không tìm thấy backup nội bộ đã chọn.");
      await verifyArchivedBackup(backup);
      const result = await adminService.restoreBackup(currentUser, backup.content, restorePassword);
      if (!result.success) throw new Error(result.message);
      setStatusMessage({ type: "success", text: result.message });
      setRestorePassword("");
      setSchool(adminService.getSchool());
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể phục hồi backup nội bộ.",
      });
    }
  };

  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert("Chỉ Admin chính mới có quyền phục hồi dữ liệu hệ thống.");
      return;
    }
    if (!restoreJson.trim() || restorePassword.length < 12) {
      setStatusMessage({ type: "error", text: "Chọn/dán tệp backup và nhập mật khẩu backup hợp lệ (ít nhất 12 ký tự)." });
      return;
    }

    if (!confirm("CẢNH BÁO: Phục hồi sẽ ghi đè cơ sở dữ liệu quản trị hiện tại bằng dữ liệu trong bản sao lưu. Bạn có chắc chắn muốn tiếp tục?")) {
      return;
    }

    try {
      const res = await adminService.restoreBackup(currentUser, restoreJson, restorePassword);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message });
        setRestoreJson("");
        setRestorePassword("");
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
            <p className="text-xs text-slate-600 leading-relaxed">
              Tệp tải xuống dùng tên riêng có UUID. Trình duyệt quyết định thư mục tải xuống và không cho ứng dụng kiểm soát hoặc bảo đảm vị trí lưu tệp.
            </p>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] space-y-1">
              <p className="font-bold">Lưu ý quan trọng về tài khoản:</p>
              <p>Tệp được mã hóa AES-GCM; không chứa tài khoản, passwordHash hoặc salt. Có thể chứa dữ liệu cá nhân học sinh/giáo viên và mã truy cập lớp. Tài khoản hiện có được giữ nguyên khi restore.</p>
            </div>
          </div>

          <label className="block space-y-1 text-xs font-semibold text-slate-700">
            Mật khẩu mã hóa backup (tối thiểu 12 ký tự)
            <input
              type="password"
              value={backupPassword}
              onChange={(event) => setBackupPassword(event.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"
            />
          </label>
          <button
            onClick={handleExportBackup}
            disabled={!isSuperAdmin || backupPassword.length < 12}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FileJson className="w-4 h-4" />
            <span>Tải Xuống Backup Mã Hóa (Toàn Trường)</span>
          </button>
          <button
            onClick={handleSaveInternalBackup}
            disabled={!isSuperAdmin || backupPassword.length < 12}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-slate-700 hover:bg-slate-800 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            Lưu Backup Mã Hóa Trong Trình Duyệt
          </button>
          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h4 className="text-xs font-bold text-slate-700">Kho backup nội bộ (IndexedDB)</h4>
            {savedBackups.length === 0 ? (
              <p className="text-xs text-slate-500">Chưa có backup nội bộ.</p>
            ) : savedBackups.map((backup) => (
              <div key={backup.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-[11px]">
                <span className="font-mono break-all">
                  {backup.id} · {backup.timestamp} · schema {backup.schemaVersion}
                </span>
                <button
                  type="button"
                  disabled={!isSuperAdmin || restorePassword.length < 12}
                  onClick={() => void handleRestoreArchivedBackup(backup.id)}
                  className="rounded-lg bg-purple-700 px-3 py-1.5 font-bold text-white disabled:opacity-50"
                >
                  Phục hồi
                </button>
              </div>
            ))}
          </div>
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
            Chọn tệp backup mã hóa hoặc dán nội dung. Hệ thống kiểm tra checksum, giải mã và xác thực schema trước khi ghi; nếu lỗi ghi, sẽ báo lỗi và cố gắng hoàn tác. Dữ liệu tài khoản không được phục hồi.
          </p>

          <form onSubmit={handleRestoreBackup} className="space-y-3">
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  setRestoreJson(await file.text());
                } catch {
                  setStatusMessage({ type: "error", text: "Không thể đọc tệp backup đã chọn." });
                }
              }}
              className="block w-full rounded-xl border border-slate-200 p-2 text-xs"
            />
            <textarea
              rows={4}
              value={restoreJson}
              onChange={(e) => setRestoreJson(e.target.value)}
              placeholder="Dán mã JSON bản sao lưu vào đây..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-slate-50/50"
            />
            <label className="block space-y-1 text-xs font-semibold text-slate-700">
              Mật khẩu giải mã backup
              <input
                type="password"
                value={restorePassword}
                onChange={(event) => setRestorePassword(event.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 font-normal"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!restoreJson.trim() || restorePassword.length < 12}
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
        <MigrationPreviewPanel />
      )}

      {isSuperAdmin && recoverableStages.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h3 className="text-sm font-bold text-amber-950">Staging cần phục hồi</h3>
          <p className="text-xs text-amber-900">
            Journal tồn tại từ lần chạy trước. Nhập mật khẩu staging để xác thực snapshot và rollback.
            Dữ liệu ngoài snapshot sẽ không bị ghi đè.
          </p>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">
            Mật khẩu staging
            <input
              type="password"
              value={stageRecoveryPassword}
              onChange={(event) => setStageRecoveryPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal"
            />
          </label>
          <ul className="space-y-2">
            {recoverableStages.map((stage) => (
              <li key={stage.stageId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-xs">
                <span className="font-mono">{stage.stageId} · {stage.status} · {stage.updatedAt}</span>
                <button
                  type="button"
                  disabled={stageRecoveryPassword.length < 12}
                  onClick={() => void handleRecoverStage(stage.stageId)}
                  className="rounded-lg bg-amber-700 px-3 py-2 font-bold text-white disabled:opacity-50"
                >
                  Xác thực & rollback
                </button>
              </li>
            ))}
          </ul>
        </section>
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
