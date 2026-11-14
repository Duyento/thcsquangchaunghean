import { useState } from "react";
import {
  captureReadOnlyLocalStorageSnapshot,
  createSnapshotFilename,
  getSnapshotLogCountDelta,
  inspectBackupBytes,
  inspectLocalStorage,
  type MigrationPreviewReport,
  type ReadOnlySnapshotSummary,
} from "../../services/migrationPreview";

function createUniqueSuffix(): string {
  const bytes = new Uint8Array(8);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatChecksumStatus(report: MigrationPreviewReport): string {
  switch (report.checksum.status) {
    case "matched":
      return "SHA-256 khớp checksum chuẩn.";
    case "mismatch":
      return "SHA-256 không khớp; xác nhận bị từ chối.";
    case "invalid_expected":
      return "Checksum chuẩn không hợp lệ.";
    case "baseline_missing":
      return "Đã tính SHA-256 nhưng chưa có checksum chuẩn để đối chiếu.";
  }
}

function formatLogCountDelta(
  snapshot: ReadOnlySnapshotSummary,
  baseline: MigrationPreviewReport | null
): string {
  const delta = getSnapshotLogCountDelta(snapshot, baseline);
  if (delta === null) {
    return "Chênh lệch logs: chưa xác định — cần phân tích backup cũ với checksum độc lập hợp lệ.";
  }
  return `Chênh lệch logs (bản chụp mới trừ backup cũ): ${delta >= 0 ? "+" : ""}${delta}`;
}

export default function MigrationPreviewPanel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expectedChecksum, setExpectedChecksum] = useState("");
  const [report, setReport] = useState<MigrationPreviewReport | null>(null);
  const [baselineReport, setBaselineReport] = useState<MigrationPreviewReport | null>(null);
  const [snapshotSummary, setSnapshotSummary] = useState<ReadOnlySnapshotSummary | null>(null);
  const [snapshotFilename, setSnapshotFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const runLocalStoragePreview = async () => {
    setBusy(true);
    setActionError("");
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        setActionError("LocalStorage không khả dụng trong môi trường hiện tại.");
        setReport(null);
        return;
      }
      const result = await inspectLocalStorage(
        window.localStorage,
        expectedChecksum.trim() || undefined
      );
      setReport(result);
    } catch {
      setReport(null);
      setActionError("Không thể tạo preview chỉ đọc. Không có dữ liệu nào được thay đổi.");
    } finally {
      setBusy(false);
    }
  };

  const runBackupPreview = async () => {
    if (!selectedFile) {
      setActionError("Chọn tệp JSON backup trước khi phân tích.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const result = await inspectBackupBytes(bytes, expectedChecksum.trim());
      setReport(result);
      setBaselineReport(result);
    } catch {
      setReport(null);
      setBaselineReport(null);
      setActionError("Không thể đọc hoặc phân tích tệp. Không có dữ liệu nào được thay đổi.");
    } finally {
      setBusy(false);
    }
  };

  const createLocalStorageSnapshot = async () => {
    setBusy(true);
    setActionError("");
    setSnapshotSummary(null);
    setSnapshotFilename("");
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        setActionError("LocalStorage không khả dụng trong môi trường hiện tại.");
        return;
      }
      const capturedAt = new Date().toISOString();
      const capture = await captureReadOnlyLocalStorageSnapshot(
        window.localStorage,
        window.location.origin,
        capturedAt
      );
      if (capture.summary.readStatus === "invalid") {
        setActionError("Không thể hoàn tất kiểm kê an toàn vì có khóa LocalStorage không hợp lệ; không tải tệp.");
        return;
      }
      const filename = createSnapshotFilename(capturedAt, createUniqueSuffix());
      const blob = new Blob([JSON.stringify(capture.snapshot, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setSnapshotSummary(capture.summary);
      setSnapshotFilename(filename);
    } catch {
      setActionError("Không thể tạo bản chụp. Không có dữ liệu nguồn nào được thay đổi.");
    } finally {
      setBusy(false);
    }
  };

  const exportReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bdg-d3-preview-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-teal-200 bg-teal-50/40 p-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">
          D-3 · Kiểm kê và xem trước migration
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Chỉ đọc sáu khóa LocalStorage BDG được cho phép hoặc tệp JSON do quản trị viên chọn.
          Snapshot tải xuống chỉ chứa số lượng, fingerprint và trạng thái an toàn; không chứa giá trị raw,
          thông tin cá nhân hay credential. Không gọi Firebase, seed, restore hay thao tác ghi.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-slate-700">
          Checksum SHA-256 chuẩn đã xác minh
          <input
            value={expectedChecksum}
            onChange={(event) => setExpectedChecksum(event.target.value)}
            placeholder="64 ký tự hexadecimal"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-normal"
          />
          <span className="block font-normal text-slate-500">
            Dùng cho tệp backup cũ. Không dùng hash do công cụ tự tính làm checksum chuẩn độc lập.
          </span>
        </label>

        <label className="space-y-1 text-xs font-semibold text-slate-700">
          Tệp JSON backup
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null);
              setReport(null);
              setBaselineReport(null);
              setActionError("");
            }}
            className="block w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-normal"
          />
          <span className="block font-normal text-slate-500">
            Backup cũ chỉ được phân tích sau khi checksum tệp khớp.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runLocalStoragePreview}
          disabled={busy}
          className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          Đọc sáu khóa LocalStorage BDG
        </button>
        <button
          type="button"
          onClick={createLocalStorageSnapshot}
          disabled={busy}
          className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          Tạo inventory JSON đã khử dữ liệu
        </button>
        <button
          type="button"
          onClick={runBackupPreview}
          disabled={busy || !selectedFile}
          className="rounded-lg border border-teal-700 bg-white px-3 py-2 text-xs font-bold text-teal-800 disabled:opacity-50"
        >
          Phân tích tệp backup
        </button>
        {report && (
          <button
            type="button"
            onClick={exportReport}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
          >
            Tải báo cáo đã khử định danh
          </button>
        )}
      </div>

      {busy && <p className="text-xs text-slate-600">Đang kiểm kê chỉ đọc…</p>}
      {actionError && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {actionError}
        </p>
      )}

      {snapshotSummary && (
        <div className="space-y-3 rounded-lg border border-indigo-200 bg-white p-3 text-xs" aria-live="polite">
          <div className="space-y-1">
            <p className="font-bold text-slate-800">Đã tạo tệp inventory an toàn: {snapshotFilename}</p>
            <p className="text-slate-600">
              Trạng thái đọc: {snapshotSummary.readStatus} · Tổng số bản ghi: {snapshotSummary.totalRecords ?? "không xác định"} ·
              {" "}Thời điểm UTC: {snapshotSummary.capturedAt}
            </p>
            <p className="text-slate-600">
              SHA-256 độc lập trong PowerShell:
              {" "}
              <code className="break-all">Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\path\to\{snapshotFilename}'</code>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2">Nhóm</th>
                  <th className="p-2">Khóa LocalStorage</th>
                  <th className="p-2">Số bản ghi</th>
                  <th className="p-2">ID fingerprint</th>
                  <th className="p-2">Mapping Firebase</th>
                  <th className="p-2">Trạng thái tài khoản</th>
                  <th className="p-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {snapshotSummary.groups.map((group) => (
                  <tr key={group.key} className="border-t border-slate-100">
                    <td className="p-2 font-semibold">{group.group}</td>
                    <td className="p-2 font-mono">{group.key}</td>
                    <td className="p-2">{group.recordCount ?? "không xác định"}</td>
                    <td className="p-2">{group.idFingerprints.length}</td>
                    <td className="p-2">
                      {group.mappingStatus === "not_checked" ? "Chưa kiểm tra" : "Không áp dụng"}
                    </td>
                    <td className="p-2">
                      {group.accountStatusCounts
                        ? `active ${group.accountStatusCounts.active} · locked ${group.accountStatusCounts.locked} · pending ${group.accountStatusCounts.pending} · khác ${group.accountStatusCounts.unknown}`
                        : "—"}
                    </td>
                    <td className="p-2">{group.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="font-semibold text-slate-800">
            {formatLogCountDelta(snapshotSummary, baselineReport)}
          </p>
        </div>
      )}

      {report && (
        <div className="space-y-3" aria-live="polite">
          <div
            className={`rounded-lg border p-3 text-xs ${
              report.canConfirmInventory
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <p className="font-bold">
              {report.canConfirmInventory
                ? "Checksum và cấu trúc đã được xác nhận."
                : "Chưa đủ cơ sở xác nhận kiểm kê."}
            </p>
            <p className="mt-1">{formatChecksumStatus(report)}</p>
            <p className="mt-1">
              Đây chỉ là xác nhận kiểm kê, không phải phê duyệt chuyển dữ liệu.
            </p>
          </div>

          {report.issues.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-white p-3">
              <h4 className="text-xs font-bold text-slate-800">Lỗi và quan hệ cần rà soát</h4>
              <ul className="mt-2 max-h-56 space-y-2 overflow-auto text-xs">
                {report.issues.map((issue, index) => (
                  <li key={`${issue.code}-${issue.sourceIdFingerprint ?? index}`} className="border-b border-slate-100 pb-2 last:border-0">
                    <span className="font-semibold">{issue.group}</span>
                    {" · "}
                    <span>{issue.message}</span>
                    {issue.fields && issue.fields.length > 0 && (
                      <span className="block text-slate-500">
                        Trường cần kiểm tra: {issue.fields.join(", ")}
                      </span>
                    )}
                    {issue.sourceIdFingerprint && (
                      <span className="block font-mono text-slate-500">
                        ID fingerprint: {issue.sourceIdFingerprint}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2">Nhóm</th>
                  <th className="p-2">Tổng</th>
                  <th className="p-2">Hợp lệ</th>
                  <th className="p-2">Trùng</th>
                  <th className="p-2">Thiếu/sai trường</th>
                  <th className="p-2">Mồ côi</th>
                  <th className="p-2">Không xác minh quan hệ</th>
                  <th className="p-2">DEMO</th>
                  <th className="p-2">VERIFIED</th>
                  <th className="p-2">UNKNOWN</th>
                  <th className="p-2">Không chuyển</th>
                  <th className="p-2">Đề xuất chuyển</th>
                  <th className="p-2">Giá trị được bảo vệ</th>
                  <th className="p-2">Cách ly</th>
                </tr>
              </thead>
              <tbody>
                {report.groups.map((group) => (
                  <tr key={group.group} className="border-t border-slate-100">
                    <td className="p-2 font-semibold">{group.group}</td>
                    <td className="p-2">{group.total}</td>
                    <td className="p-2">{group.valid}</td>
                    <td className="p-2">{group.duplicate}</td>
                    <td className="p-2">{group.missingFields}</td>
                    <td className="p-2">{group.orphaned}</td>
                    <td className="p-2">{group.unverifiableRelations}</td>
                    <td className="p-2">{group.demo}</td>
                    <td className="p-2">{group.verified}</td>
                    <td className="p-2">{group.unknown}</td>
                    <td className="p-2">{group.notMigratable}</td>
                    <td className="p-2">{group.migrationEligible}</td>
                    <td className="p-2">{group.protectedValuesExcluded}</td>
                    <td className="p-2">{group.quarantined}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 font-bold">
                <tr>
                  <td className="p-2">Tổng</td>
                  <td className="p-2">{report.totalRecords}</td>
                  <td className="p-2">{report.valid}</td>
                  <td className="p-2">{report.duplicate}</td>
                  <td className="p-2">{report.missingFields}</td>
                  <td className="p-2">{report.orphaned}</td>
                  <td className="p-2">{report.unverifiableRelations}</td>
                  <td className="p-2">{report.demo}</td>
                  <td className="p-2">{report.verified}</td>
                  <td className="p-2">{report.unknown}</td>
                  <td className="p-2">{report.notMigratable}</td>
                  <td className="p-2">{report.migrationEligible}</td>
                  <td className="p-2">{report.protectedValuesExcluded}</td>
                  <td className="p-2">{report.quarantined}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="rounded-lg bg-white p-3 text-xs text-slate-600">
            <p>
              {report.totalGroups} nhóm · {report.totalRecords} bản ghi ·
              {" "}schema nguồn: {report.sourceSchemaVersion ?? "không có/không xác định"} ·
              {" "}SHA-256: {report.checksum.actual ?? "không tính được"}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {report.notices.map((notice) => <li key={notice}>{notice}</li>)}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
