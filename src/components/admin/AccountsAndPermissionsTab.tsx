import { useState } from "react";
import { adminService } from "../../services/adminService";
import { UserAccount, AdminPermission } from "../../types/adminTypes";
import {
  ShieldAlert,
  Plus,
  Lock,
  Unlock,
  Key,
  CheckCircle2,
  AlertCircle,
  X,
  Crown,
  User,
  Mail,
  Shield,
} from "lucide-react";

interface AccountsAndPermissionsTabProps {
  currentUser: UserAccount;
}

const ALL_PERMISSIONS: { id: AdminPermission; label: string; desc: string }[] = [
  { id: "manage_classes", label: "Quản lý lớp học", desc: "Tạo, sửa tên, gán GVCN và khóa lớp học" },
  { id: "manage_students", label: "Quản lý học sinh", desc: "Thêm học sinh và chuyển học sinh giữa các lớp" },
  { id: "manage_teachers", label: "Quản lý giáo viên", desc: "Quản lý hồ sơ giáo viên và phân công chủ nhiệm" },
  { id: "manage_questions", label: "Quản lý câu hỏi", desc: "Xem và cập nhật ngân hàng câu hỏi trắc nghiệm" },
  { id: "manage_posts", label: "Quản lý bài viết", desc: "Biên tập các bài viết tuyên truyền trên website" },
  { id: "manage_videos", label: "Quản lý video", desc: "Đăng tải và phê duyệt video truyền thông học đường" },
  { id: "manage_images", label: "Quản lý hình ảnh", desc: "Quản lý thư viện hình ảnh cổ động và poster" },
  { id: "view_reports", label: "Xem báo cáo", desc: "Xem thống kê điểm số và báo cáo toàn trường" },
  { id: "manage_campaigns", label: "Quản lý nội dung tuyên truyền", desc: "Điều hành chiến dịch thanh thiếu niên và sáng kiến số" },
];

export default function AccountsAndPermissionsTab({ currentUser }: AccountsAndPermissionsTabProps) {
  const [users, setUsers] = useState<UserAccount[]>(() => adminService.getUsers(currentUser));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<UserAccount | null>(null);

  // Create form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [plainPassword, setPlainPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermission[]>([
    "manage_classes",
    "manage_students",
    "view_reports",
  ]);
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const isSuperAdmin = currentUser.role === "super_admin";

  const refreshList = () => {
    setUsers(adminService.getUsers(currentUser));
  };

  const handleTogglePermission = (permId: AdminPermission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!fullName.trim() || !email.trim() || !plainPassword) {
      setFormError("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }

    let res;
    try {
      res = await adminService.createSubAdmin(currentUser, {
        fullName: fullName.trim(),
        email: email.trim(),
        plainPassword,
        permissions: selectedPermissions,
        phone: phone.trim(),
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể tạo Admin phụ.");
      return;
    }

    if (res.success) {
      refreshList();
      setShowCreateModal(false);
      setFullName("");
      setEmail("");
      setPlainPassword("");
      setPhone("");
      setActionSuccess(`Đã tạo thành công tài khoản Admin phụ cho ${res.user?.fullName}!`);
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể tạo Admin phụ.");
    }
  };

  const handleSaveEditedPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermissionsUser) return;
    setFormError("");

    let res;
    try {
      res = await adminService.updateSubAdminPermissions(
        currentUser,
        editingPermissionsUser.id,
        selectedPermissions
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật quyền.");
      return;
    }

    if (res.success) {
      refreshList();
      setEditingPermissionsUser(null);
      setActionSuccess("Đã cập nhật danh sách quyền thành công!");
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể cập nhật quyền.");
    }
  };

  const handleToggleUserStatus = async (target: UserAccount) => {
    let res;
    try {
      res = await adminService.toggleUserStatus(currentUser, target.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể cập nhật trạng thái tài khoản.");
      return;
    }
    if (res.success) {
      refreshList();
      setActionSuccess(
        `Đã ${res.newStatus === "locked" ? "khóa" : "kích hoạt"} tài khoản của ${target.fullName}`
      );
      setTimeout(() => setActionSuccess(""), 3000);
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-600" />
            <span>Tài Khoản & Phân Quyền Quản Trị</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý Admin chính duy nhất, tạo Admin phụ và phân quyền chặt chẽ theo 9 nhóm chức năng
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setSelectedPermissions(["manage_classes", "manage_students", "view_reports"]);
              setFormError("");
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Admin Phụ Mới</span>
          </button>
        )}
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Security Rule Card */}
      <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 text-xs text-purple-900 space-y-1.5">
        <p className="font-bold flex items-center gap-1.5 text-purple-950">
          <Shield className="w-4 h-4 text-purple-600" />
          <span>Chính sách phân quyền bảo mật trường học:</span>
        </p>
        <ul className="list-disc pl-5 space-y-0.5 text-purple-900/90">
          <li><strong>Admin chính:</strong> Duy nhất 1 tài khoản, toàn quyền quản trị, không ai có thể khóa hoặc xóa.</li>
          <li><strong>Admin phụ:</strong> Chỉ thực hiện các thao tác trong phạm vi quyền được cấp. Không thể tự nâng quyền hay tạo Admin chính.</li>
        </ul>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tài Khoản / Họ Tên</th>
                <th className="py-3 px-4">Vai Trò</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Quyền Được Cấp</th>
                <th className="py-3 px-4">Thời Gian Tạo / Người Cấp</th>
                {isSuperAdmin && <th className="py-3 px-4 text-right">Thao Tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {users.map((u) => {
                const isSuper = u.role === "super_admin";
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                          isSuper ? "bg-amber-500" : "bg-purple-600"
                        }`}>
                          {isSuper ? <Crown className="w-4 h-4" /> : u.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.fullName}</p>
                          <p className="text-slate-400 font-mono text-[11px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {isSuper ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                          <Crown className="w-3 h-3 text-amber-600" />
                          <span>Admin chính</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                          Admin phụ
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.status === "active" ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                          Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      {isSuper ? (
                        <span className="text-amber-800 font-semibold italic">Toàn bộ 9 nhóm quyền hệ thống</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.permissions.length === 0 ? (
                            <span className="text-slate-400 italic">Chưa cấp quyền</span>
                          ) : (
                            u.permissions.map((p) => {
                              const permObj = ALL_PERMISSIONS.find((item) => item.id === p);
                              return (
                                <span
                                  key={p}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]"
                                >
                                  {permObj?.label || p}
                                </span>
                              );
                            })
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      <p>{new Date(u.createdAt).toLocaleDateString("vi-VN")}</p>
                      <p className="text-slate-400">Bởi: {u.createdBy}</p>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        {!isSuper ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingPermissionsUser(u);
                                setSelectedPermissions([...u.permissions]);
                                setFormError("");
                              }}
                              title="Chỉnh sửa phân quyền"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              title={u.status === "active" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              {u.status === "active" ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-emerald-600" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Bảo vệ tối cao</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SUB-ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                <span>Tạo Tài Khoản Admin Phụ Mới</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubAdmin} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Họ và tên Admin phụ:</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: Thầy Trần Quang Huy"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Email đăng nhập:</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="huytq@thcsquangchau.edu.vn"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Mật khẩu (tối thiểu 6 ký tự):</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={plainPassword}
                    onChange={(e) => setPlainPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Số điện thoại liên hệ:</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Permissions Checkbox Grid */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-800 block">
                  Cấp quyền chức năng ({selectedPermissions.length} quyền được chọn):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                          isChecked
                            ? "bg-purple-50 border-purple-400 text-purple-950"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <div>
                          <p className="font-bold leading-tight">{perm.label}</p>
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{perm.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-purple-600 hover:bg-purple-700 font-bold shadow-xs cursor-pointer"
                >
                  Tạo Admin Phụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PERMISSIONS MODAL */}
      {editingPermissionsUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-600" />
                <span>Cập Nhật Quyền: {editingPermissionsUser.fullName}</span>
              </h3>
              <button
                onClick={() => setEditingPermissionsUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Admin phụ chỉ được truy cập và thao tác trên những phân hệ được Admin chính cấp phép.
            </p>

            <form onSubmit={handleSaveEditedPermissions} className="space-y-4 text-xs">
              <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                {ALL_PERMISSIONS.map((perm) => {
                  const isChecked = selectedPermissions.includes(perm.id);
                  return (
                    <div
                      key={perm.id}
                      onClick={() => handleTogglePermission(perm.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked
                          ? "bg-purple-50 border-purple-400 text-purple-950 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p>{perm.label}</p>
                        <p className="text-[10px] text-slate-500 font-normal">{perm.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPermissionsUser(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-purple-600 hover:bg-purple-700 font-bold shadow-xs cursor-pointer"
                >
                  Lưu Phân Quyền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
