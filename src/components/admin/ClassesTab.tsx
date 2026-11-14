import { useState } from "react";
import { adminService } from "../../services/adminService";
import { Grade, SchoolClass, UserAccount, Teacher } from "../../types/adminTypes";
import * as XLSX from "xlsx";
import {
  School,
  Plus,
  Search,
  Filter,
  Edit2,
  Eye,
  Lock,
  Unlock,
  Archive,
  Trash2,
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
  initialGradeFilter?: Pick<Grade, "schoolId" | "academicYear" | "id" | "level">;
}

function gradeScopeKey(grade: Pick<Grade, "schoolId" | "academicYear" | "id">): string {
  return JSON.stringify([grade.schoolId, grade.academicYear, grade.id]);
}

type ClassAction = {
  action: "archive" | "restore" | "delete";
  schoolClass: SchoolClass;
  studentCount: number;
};

export default function ClassesTab({ currentUser, initialGradeFilter }: ClassesTabProps) {
  const school = adminService.getSchool();
  const [classes, setClasses] = useState<SchoolClass[]>(adminService.getClasses());
  const [teachers, setTeachers] = useState<Teacher[]>(adminService.getTeachers());
  const grades = adminService.getGradesForSchool(school.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>(
    initialGradeFilter ? gradeScopeKey(initialGradeFilter) : "all"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classDetails, setClassDetails] = useState<SchoolClass | null>(null);
  const [pendingClassAction, setPendingClassAction] = useState<ClassAction | null>(null);

  // Form states
  const [newClassName, setNewClassName] = useState("");
  const [newGradeScope, setNewGradeScope] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newAccessCode, setNewAccessCode] = useState("");
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canManageClasses = adminService.hasPermission(currentUser, "manage_classes");
  const selectedGrade = grades.find((grade) => gradeScopeKey(grade) === gradeFilter);
  const formGrades = editingClass
    ? grades.filter(
      (grade) =>
        grade.schoolId === editingClass.schoolId
        && grade.academicYear === editingClass.academicYear
    )
    : adminService.getGrades(school.id, school.academicYear);
  const selectedFormGrade = formGrades.find((grade) => gradeScopeKey(grade) === newGradeScope);

  const refreshList = () => {
    setClasses(adminService.getClasses());
    setTeachers(adminService.getTeachers());
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
    const matchesGrade = gradeFilter === "all" || Boolean(
      selectedGrade
      && c.schoolId === selectedGrade.schoolId
      && c.academicYear === selectedGrade.academicYear
      && c.gradeId === selectedGrade.id
      && c.gradeLevel === selectedGrade.level
    );
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesGrade && matchesStatus;
  });
  const pendingDeleteEligibility = pendingClassAction?.action === "delete"
    ? adminService.getClassDeletionEligibility(currentUser, pendingClassAction.schoolClass.id)
    : null;

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newClassName.trim()) {
      setFormError("Vui lòng nhập tên lớp.");
      return;
    }
    if (!selectedFormGrade) {
      setFormError("Vui lòng chọn khối thuộc trường và năm học hợp lệ.");
      return;
    }

    const selectedTeacher = teachers.find((t) => t.id === newTeacherId);
    let res;
    try {
      res = await adminService.createClass(currentUser, {
        name: newClassName.trim(),
        gradeLevel: selectedFormGrade.level,
        academicYear: selectedFormGrade.academicYear,
        homeroomTeacherId: selectedTeacher?.id,
        homeroomTeacherName: selectedTeacher?.fullName,
        roomNumber: newRoomNumber.trim(),
        accessCode: newAccessCode.trim().toUpperCase() || undefined,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể tạo lớp học.");
      return;
    }

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

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    setFormError("");
    if (!selectedFormGrade) {
      setFormError("Vui lòng chọn khối thuộc trường và năm học hợp lệ.");
      return;
    }

    const selectedTeacher = teachers.find((t) => t.id === newTeacherId);
    let res;
    try {
      res = await adminService.updateClass(currentUser, editingClass.id, {
        name: newClassName.trim(),
        gradeLevel: selectedFormGrade.level,
        academicYear: selectedFormGrade.academicYear,
        homeroomTeacherId: selectedTeacher?.id || "",
        homeroomTeacherName: selectedTeacher?.fullName || "",
        roomNumber: newRoomNumber.trim(),
        accessCode: newAccessCode.trim().toUpperCase() || undefined,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật lớp.");
      return;
    }

    if (res.success) {
      refreshList();
      setEditingClass(null);
      setActionSuccess("Đã cập nhật thông tin lớp học và mã lớp!");
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể cập nhật lớp.");
    }
  };

  const handleToggleLock = async (cls: SchoolClass) => {
    const newStatus = cls.status === "locked" ? "active" : "locked";
    try {
      const result = await adminService.updateClass(currentUser, cls.id, { status: newStatus });
      if (!result.success) {
        setFormError(result.error || "Không thể cập nhật trạng thái lớp.");
        return;
      }
      refreshList();
      setActionSuccess(`Đã ${newStatus === "locked" ? "khóa" : "mở khóa"} lớp ${cls.name}`);
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật trạng thái lớp.");
    }
  };

  const getRelatedStudentCount = (cls: SchoolClass) =>
    adminService.getInternalStudentsByClass(cls.id).length;

  const openClassAction = (cls: SchoolClass, action: ClassAction["action"]) => {
    setFormError("");
    setPendingClassAction({
      action,
      schoolClass: cls,
      studentCount: getRelatedStudentCount(cls),
    });
  };

  const handleConfirmClassAction = async () => {
    if (!pendingClassAction) return;
    const { action, schoolClass } = pendingClassAction;
    try {
      if (action === "delete") {
        const result = await adminService.deleteClass(currentUser, schoolClass.id);
        if (!result.success) {
          setFormError(result.error || "Không thể xóa lớp học.");
          return;
        }
        refreshList();
        setPendingClassAction(null);
        setActionSuccess(`Đã xóa lớp ${schoolClass.name}.`);
        setTimeout(() => setActionSuccess(""), 3500);
        return;
      }

      const result = await adminService.setClassArchived(currentUser, schoolClass.id, action === "archive");
      if (!result.success) {
        setFormError(result.error || "Không thể cập nhật trạng thái lớp.");
        return;
      }
      refreshList();
      setPendingClassAction(null);
      setActionSuccess(
        action === "archive"
          ? `Đã lưu trữ lớp ${schoolClass.name}; dữ liệu học sinh và lịch sử được giữ nguyên.`
          : `Đã khôi phục lớp ${schoolClass.name}.`
      );
      setTimeout(() => setActionSuccess(""), 3500);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể thực hiện thao tác với lớp.");
    }
  };

  const openEditModal = (cls: SchoolClass) => {
    setEditingClass(cls);
    setNewClassName(cls.name);
    const currentGrade = grades.find(
      (grade) =>
        grade.schoolId === cls.schoolId
        && grade.academicYear === cls.academicYear
        && grade.id === cls.gradeId
        && grade.level === cls.gradeLevel
    );
    setNewGradeScope(currentGrade ? gradeScopeKey(currentGrade) : "");
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
                const initialGrade = adminService.getGrades(school.id, school.academicYear)
                  .find((grade) => grade.level === 6);
                setNewGradeScope(initialGrade ? gradeScopeKey(initialGrade) : "");
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
              {grades.map((grade) => (
                <option key={gradeScopeKey(grade)} value={gradeScopeKey(grade)}>
                  Khối {grade.level} · {grade.academicYear}
                </option>
              ))}
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
                <th className="py-3 px-4 text-right">{canManageClasses ? "Thao Tác" : "Chi Tiết"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={canManageClasses ? 8 : 7} className="py-8 text-center text-slate-400">
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
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setClassDetails(cls)}
                          title="Xem chi tiết lớp"
                          aria-label={`Xem chi tiết lớp ${cls.name}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canManageClasses && (
                          <>
                          <button
                            onClick={() => openEditModal(cls)}
                            title="Chỉnh sửa thông tin"
                            aria-label={`Sửa lớp ${cls.name}`}
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
                            onClick={() => openClassAction(cls, cls.status === "archived" ? "restore" : "archive")}
                            title={cls.status === "archived" ? "Khôi phục lớp" : "Lưu trữ lớp"}
                            aria-label={cls.status === "archived" ? `Khôi phục lớp ${cls.name}` : `Lưu trữ lớp ${cls.name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openClassAction(cls, "delete")}
                            title={`Xóa lớp ${cls.name} (chỉ khi không còn dữ liệu liên quan)`}
                            aria-label={`Xóa lớp ${cls.name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          </>
                        )}
                      </div>
                    </td>
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
                  value={newGradeScope}
                  onChange={(e) => setNewGradeScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Chọn khối và năm học</option>
                  {formGrades.map((grade) => (
                    <option key={gradeScopeKey(grade)} value={gradeScopeKey(grade)}>
                      Khối {grade.level} · {grade.academicYear}
                    </option>
                  ))}
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
                  value={newGradeScope}
                  onChange={(e) => setNewGradeScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn khối và năm học</option>
                  {formGrades.map((grade) => (
                    <option key={gradeScopeKey(grade)} value={gradeScopeKey(grade)}>
                      Khối {grade.level} · {grade.academicYear}
                    </option>
                  ))}
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

      {classDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setClassDetails(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="class-details-title" className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 id="class-details-title" className="text-lg font-bold text-slate-900">Chi tiết lớp {classDetails.name}</h3>
                <p className="mt-1 text-xs text-slate-500">Thông tin lớp và dữ liệu liên quan</p>
              </div>
              <button type="button" onClick={() => setClassDetails(null)} aria-label="Đóng chi tiết lớp" className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Khối</dt><dd className="mt-1 font-semibold text-slate-900">Khối {classDetails.gradeLevel}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Năm học</dt><dd className="mt-1 font-semibold text-slate-900">{classDetails.academicYear}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Giáo viên chủ nhiệm</dt><dd className="mt-1 font-semibold text-slate-900">{classDetails.homeroomTeacherName || "Chưa gán"}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Phòng học</dt><dd className="mt-1 font-semibold text-slate-900">{classDetails.roomNumber || "Chưa cập nhật"}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Mã lớp</dt><dd className="mt-1 font-mono font-semibold text-slate-900">{classDetails.accessCode || `QC${classDetails.name}`}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Số học sinh</dt><dd className="mt-1 font-semibold text-slate-900">{getRelatedStudentCount(classDetails)}</dd></div>
              <div className="rounded-xl bg-slate-50 p-3 col-span-2"><dt className="text-xs text-slate-500">Trạng thái</dt><dd className="mt-1 font-semibold text-slate-900">{classDetails.status === "active" ? "Hoạt động" : classDetails.status === "locked" ? "Đã khóa" : "Lưu trữ"}</dd></div>
            </dl>
            <div className="flex justify-end gap-2">
              {canManageClasses && (
                <button type="button" onClick={() => { openEditModal(classDetails); setClassDetails(null); }} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700">
                  <Edit2 className="w-3.5 h-3.5" /> Sửa thông tin
                </button>
              )}
              <button type="button" onClick={() => setClassDetails(null)} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Đóng</button>
            </div>
          </section>
        </div>
      )}

      {pendingClassAction && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="class-action-title" className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 id="class-action-title" className="text-base font-bold text-slate-900">
                  {pendingClassAction.action === "archive"
                    ? "Xác nhận lưu trữ lớp"
                    : pendingClassAction.action === "restore"
                      ? "Xác nhận khôi phục lớp"
                      : "Xác nhận xóa lớp"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Lớp <strong>{pendingClassAction.schoolClass.name}</strong> · {pendingClassAction.studentCount} học sinh liên quan
                </p>
              </div>
              <button type="button" onClick={() => setPendingClassAction(null)} aria-label="Đóng xác nhận" className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {pendingClassAction.action === "archive" && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                Lớp sẽ được chuyển sang trạng thái lưu trữ. Hồ sơ học sinh, kết quả, cam kết và lịch sử lớp được giữ nguyên.
              </p>
            )}
            {pendingClassAction.action === "restore" && (
              <p className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs leading-relaxed text-teal-900">
                Khôi phục lớp về trạng thái hoạt động; dữ liệu hiện có không bị thay đổi.
              </p>
            )}
            {pendingClassAction.action === "delete" && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-900">
                {pendingDeleteEligibility?.allowed
                  ? "Lớp không có học sinh, giáo viên chủ nhiệm hoặc lịch sử học tập liên quan. Thao tác chỉ xóa hồ sơ lớp và được ghi nhật ký; không xóa dữ liệu khác."
                  : pendingDeleteEligibility?.reason || "Không thể xác minh điều kiện xóa lớp."}
              </div>
            )}

            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={() => { setPendingClassAction(null); setFormError(""); }} className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
              <button
                type="button"
                onClick={handleConfirmClassAction}
                disabled={pendingClassAction.action === "delete" && !pendingDeleteEligibility?.allowed}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  pendingClassAction.action === "delete" ? "bg-rose-600 hover:bg-rose-700" : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                {pendingClassAction.action === "archive" ? "Xác nhận lưu trữ"
                  : pendingClassAction.action === "restore" ? "Khôi phục lớp"
                    : "Xác nhận xóa lớp"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
