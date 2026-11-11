import { useState } from "react";
import { adminService } from "../../services/adminService";
import { ActivityLog, UserAccount } from "../../types/adminTypes";
import { Clock, Search, Filter, ShieldCheck, Lock } from "lucide-react";

interface ActivityLogsTabProps {
  currentUser?: UserAccount;
}

export default function ActivityLogsTab({ currentUser }: ActivityLogsTabProps = {}) {
  const [logs] = useState<ActivityLog[]>(() => adminService.getActivityLogs(currentUser));
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = entityFilter === "all" || log.entity === entityFilter;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <span>Nhật Ký Hoạt Động Hệ Thống (Audit Logs)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi vết bất biến mọi hành động tạo, sửa, xóa, cấp quyền và đăng nhập trong hệ thống quản trị
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 w-fit">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bảo mật chống sửa / xóa nhật ký</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo người thực hiện, hành động hoặc nội dung..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-600">Phân hệ:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
          >
            <option value="all">Tất cả phân hệ</option>
            <option value="user">Người dùng & Tài khoản</option>
            <option value="class">Lớp học</option>
            <option value="student">Học sinh</option>
            <option value="teacher">Giáo viên</option>
            <option value="permission">Phân quyền</option>
            <option value="system">Hệ thống & Sao lưu</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Thời Gian</th>
                <th className="py-3 px-4">Người Thực Hiện</th>
                <th className="py-3 px-4">Vai Trò</th>
                <th className="py-3 px-4">Hành Động</th>
                <th className="py-3 px-4">Phân Hệ</th>
                <th className="py-3 px-4">Chi Tiết Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Không có bản ghi nhật ký nào.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.actorName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.actorRole === "super_admin"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-purple-100 text-purple-900"
                      }`}>
                        {log.actorRole === "super_admin" ? "Admin chính" : "Admin phụ"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase font-mono text-[10px]">
                        {log.entity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
