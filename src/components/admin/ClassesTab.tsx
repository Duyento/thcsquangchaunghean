import { useState } from "react";
import { adminService } from "../../services/adminService";
import { SchoolClass, UserAccount, Teacher } from "../../types/adminTypes";
import * as XLSX from "xlsx";
import {
  School,
  Plus,
  Search,
  Filter,
  Edit2,
  Lock,
  Unlock,
  Archive,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Users,
  KeyRound,
  Copy,
  Check,
  Download,
} from "lucide-react";

interface ClassesTabProps {
  currentUser: UserAccount;
  initialGradeFilter?: number;
}

export default function ClassesTab({ currentUser, initialGradeFilter }: ClassesTabProps) {
  const [classes, setClasses] = useState<SchoolClass[]>(adminService.getClasses());
  const [teachers] = useState<Teacher[]>(adminService.getTeachers());
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>(
    initialGradeFilter ? String(initialGradeFilter) : "all"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);

  // Form states
  const [newClassName, setNewClassName] = useState("");
  const [newGradeLevel, setNewGradeLevel] = useState<6 | 7 | 8 | 9>(6);
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newAccessCode, setNewAccessCode] = useState("");
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canManageClasses = adminService.hasPermission(currentUser, "manage_classes");

  const refreshList = () => {
    setClasses(adminService.getClasses());
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportClassesToExcel = () => {
    const dataToExport = filteredClasses.map((cls, idx) => ({
      "STT": idx + 1,
      "Tên Lớp": cls.name,
      "Khối": `Khối ${cls.gradeLevel}`,
      "Mã Lớp Dùng Chung": cls.accessCode || `QC${cls.name}`,
      "Giáo Viên Chủ Nhiệm": cls.homeroomTeacherName || "Chưa gán",
      "Phòng Học": cls.roomNumber || "---",
      "Sĩ Số": cls.studentCount || 0,
      "Trạng Thái": cls.status === "active" ? "Đang hoạt động" : cls.status === "locked" ? "Đã khóa" : "Lưu trữ",
      "Năm Học": cls.academicYear,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachLopHoc");
    XLSX.writeFile(workbook, `Danh_sach_lop_THCS_Quang_Chau_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const filteredClasses = classes.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.homeroomTeacherName && c.homeroomTeacherName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.accessCode && c.accessCode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesGrade = gradeFilter === "all" || String(c.gradeLevel) === gradeFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesGrade && matchesStatus;
  });

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newClassName.trim()) {
      setFormError("Vui lòng nhập tên lớp.");
      return;
    }

    const selectedTeacher = teachers.find((t) => t.id === newTeacherId);
    const res = adminService.createClass(currentUser, {
      name: newClassName.trim(),
      gradeLevel: newGradeLevel,
      homeroomTeacherId: selectedTeacher?.id,
      homeroomTeacherName: selectedTeacher?.fullName,
      roomNumber: newRoomNumber.trim(),
      accessCode: newAccessCode.trim().toUpperCase() || undefined,
    });

    if (res.success) {
      refreshList();
      setShowCreateModal(false);
      setNewClassName("");
      setNewRoomNumber("");
      setNewTeacherId("");
      setNewAccessCode("");
      setActionSuccess(`Đã tạo thành công lớp ${res.schoolClass?.name} (Mã: ${res.schoolClass?.accessCode})!`);
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể tạo lớp học.");
    }
  };

  const handleUpdateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    setFormError("");

    const selectedTeacher = teachers.find((t) => t.id === newTeacherId);
    const res = adminService.updateClass(currentUser, editingClass.id, {
      name: newClassName.trim(),
      gradeLevel: newGradeLevel,
      homeroomTeacherId: selectedTeacher?.id || "",
      homeroomTeacherName: selectedTeacher?.fullName || "",
      roomNumber: newRoomNumber.trim(),
      accessCode: newAccessCode.trim().toUpperCase() || undefined,
    });

    if (res.success) {
      refreshList();
      setEditingClass(null);
      setActionSuccess("Đã cập nhật thông tin lớp học và mã lớp!");
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể cập nhật lớp.");
    }
  };

  const handleToggleLock = (cls: SchoolClass) => {
    const newStatus = cls.status === "locked" ? "active" : "locked";
    adminService.updateClass(currentUser, cls.id, { status: newStatus });
    refreshList();
    setActionSuccess(`Đã ${newStatus === "locked" ? "khóa" : "mở khóa"} lớp ${cls.name}`);
    setTimeout(() => setActionSuccess(""), 3000);
  };

  const handleToggleArchive = (cls: SchoolClass) => {
    const newStatus = cls.status === "archived" ? "active" : "archived";
    adminService.updateClass(currentUser, cls.id, { status: newStatus });
    refreshList();
    setActionSuccess(`Đã ${newStatus === "archived" ? "lưu trữ" : "phục hồi"} lớp ${cls.name}`);
    setTimeout(() => setActionSuccess(""), 3000);
  };

  const openEditModal = (cls: SchoolClass) => {
    setEditingClass(cls);
    setNewClassName(cls.name);
    setNewGradeLevel(cls.gradeLevel);
    setNewTeacherId(cls.homeroomTeacherId || "");
    setNewRoomNumber(cls.roomNumber || "");
    setNewAccessCode(cls.accessCode || `QC${cls.name}`);
    setFormError("");
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <School className="w-5 h-5 text-teal-600" />
            <span>Quản Lý Lớp Học</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý danh sách lớp, giáo viên chủ nhiệm, phòng học và sĩ số các khối 6, 7, 8, 9
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportClassesToExcel}
            className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer w-fit"
            title="Xuất danh sách lớp học và mã lớp ra file Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          {canManageClasses && (
            <button
              onClick={() => {
                setShowCreateModal(true);
                setNewClassName("");
                setNewRoomNumber("");
                setNewTeacherId("");
                setNewAccessCode("");
                setFormError("");
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer w-fit"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Lớp Mới</span>
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên lớp (ví dụ: 6A1, 8C1) hoặc tên giáo viên..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Grade filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Khối:</span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
            >
              <option value="all">Tất cả khối</option>
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="8">Khối 8</option>
              <option value="9">Khối 9</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
              <option value="archived">Lưu trữ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tên Lớp</th>
                <th className="py-3 px-4">Khối</th>
                <th className="py-3 px-4">Mã Lớp Dùng Chung</th>
                <th className="py-3 px-4">Giáo Viên Chủ Nhiệm</th>
                <th className="py-3 px-4">Phòng Học</th>
                <th className="py-3 px-4 text-center">Sĩ Số</th>
                <th className="py-3 px-4">Trạng Thái</th>
                {canManageClasses && <th className="py-3 px-4 text-right">Thao Tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy lớp học nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-sm text-slate-900 bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md border border-teal-200 font-mono">
                        {cls.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      Khối {cls.gradeLevel}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md">
                          {cls.accessCode || `QC${cls.name}`}
                        </span>
                        <button
                          onClick={() => handleCopyCode(cls.id, cls.accessCode || `QC${cls.name}`)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Sao chép mã lớp"
                        >
                          {copiedId === cls.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {cls.homeroomTeacherName ? (
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <UserCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{cls.homeroomTeacherName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa gán GVCN</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {cls.roomNumber || "---"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                        <Users className="w-3 h-3" />
                        {cls.studentCount || 0} hs
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {cls.status === "active" && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          Hoạt động
                        </span>
                      )}
                      {cls.status === "locked" && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                          Đã khóa
                        </span>
                      )}
                      {cls.status === "archived" && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                          Lưu trữ
                        </span>
                      )}
                    </td>
                    {canManageClasses && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(cls)}
                            title="Chỉnh sửa thông tin"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleLock(cls)}
                            title={cls.status === "locked" ? "Mở khóa lớp" : "Khóa lớp"}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                          >
                            {cls.status === "locked" ? <Unlock className="w-3.5 h-3.5 text-amber-600" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleToggleArchive(cls)}
                            title={cls.status === "archived" ? "Bỏ lưu trữ" : "Lưu trữ lớp"}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CLASS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>Thêm Lớp Học Mới</span>
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

            <form onSubmit={handleCreateClass} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Khối đào tạo:</label>
                <select
                  value={newGradeLevel}
                  onChange={(e) => setNewGradeLevel(Number(e.target.value) as 6 | 7 | 8 | 9)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value={6}>Khối 6</option>
                  <option value={7}>Khối 7</option>
                  <option value={8}>Khối 8</option>
                  <option value={9}>Khối 9</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên lớp học:</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Ví dụ: 6A3, 7A2, 8C3..."
                  maxLength={10}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase font-mono font-bold"
                />
                <p className="text-[11px] text-slate-400">
                  Hệ thống tự động kiểm tra chống trùng tên lớp trong cùng khối và năm học.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Gán Giáo viên chủ nhiệm:</label>
                <select
                  value={newTeacherId}
                  onChange={(e) => setNewTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Chưa gán GVCN --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mã lớp dùng chung (Học sinh dùng để đăng nhập):</label>
                <input
                  type="text"
                  value={newAccessCode}
                  onChange={(e) => setNewAccessCode(e.target.value)}
                  placeholder="Để trống hệ thống sẽ tự đặt: QC + Tên lớp (Ví dụ: QC6A3)"
                  maxLength={15}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase font-mono font-bold"
                />
                <p className="text-[11px] text-slate-400">
                  Mã này học sinh sẽ nhập cùng với họ tên khi đăng nhập vào Cổng Học Sinh.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Phòng học (tùy chọn):</label>
                <input
                  type="text"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  placeholder="Ví dụ: P.103, P.205"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
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
                  className="px-4 py-2 rounded-xl text-white bg-teal-600 hover:bg-teal-700 font-bold shadow-xs cursor-pointer"
                >
                  Tạo Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLASS MODAL */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Chỉnh Sửa Lớp {editingClass.name}</span>
              </h3>
              <button
                onClick={() => setEditingClass(null)}
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

            <form onSubmit={handleUpdateClass} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Khối đào tạo:</label>
                <select
                  value={newGradeLevel}
                  onChange={(e) => setNewGradeLevel(Number(e.target.value) as 6 | 7 | 8 | 9)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={6}>Khối 6</option>
                  <option value={7}>Khối 7</option>
                  <option value={8}>Khối 8</option>
                  <option value={9}>Khối 9</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên lớp:</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  maxLength={10}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Giáo viên chủ nhiệm:</label>
                <select
                  value={newTeacherId}
                  onChange={(e) => setNewTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chưa gán GVCN --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mã lớp dùng chung (Học sinh dùng để đăng nhập):</label>
                <input
                  type="text"
                  value={newAccessCode}
                  onChange={(e) => setNewAccessCode(e.target.value)}
                  placeholder="Ví dụ: QC6A1"
                  maxLength={15}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Phòng học:</label>
                <input
                  type="text"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  placeholder="Ví dụ: P.201"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold shadow-xs cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
