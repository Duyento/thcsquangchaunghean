import { useState } from "react";
import { adminService } from "../../services/adminService";
import { Teacher, SchoolClass, UserAccount } from "../../types/adminTypes";
import { Users, Plus, Mail, Phone, BookOpen, UserCheck, X, CheckCircle2, AlertCircle } from "lucide-react";

interface TeachersTabProps {
  currentUser: UserAccount;
}

export default function TeachersTab({ currentUser }: TeachersTabProps) {
  const [teachers, setTeachers] = useState<Teacher[]>(() => adminService.getTeachers(currentUser));
  const classes: SchoolClass[] = adminService.getClasses();
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Khoa học Tự nhiên & STEM");
  const [homeroomClassId, setHomeroomClassId] = useState("");
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const canManageTeachers = adminService.hasPermission(currentUser, "manage_teachers");

  const refreshList = () => {
    setTeachers(adminService.getTeachers(currentUser));
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!fullName.trim() || !email.trim()) {
      setFormError("Vui lòng điền họ tên và email giáo viên.");
      return;
    }

    let res;
    try {
      res = await adminService.createTeacher(currentUser, {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        homeroomClassId: homeroomClassId || undefined,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể thêm giáo viên.");
      return;
    }

    if (res.success) {
      refreshList();
      setShowAddModal(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setHomeroomClassId("");
      setActionSuccess("Đã thêm thành công hồ sơ giáo viên!");
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể thêm giáo viên.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <span>Quản Lý Giáo Viên & Cán Bộ</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách cán bộ giáo viên, giáo viên chủ nhiệm và phân công bộ môn tại trường THCS Quảng Châu
          </p>
        </div>

        {canManageTeachers && (
          <button
            onClick={() => {
              setShowAddModal(true);
              setFormError("");
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Giáo Viên Mới</span>
          </button>
        )}
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map((teacher) => (
          <div
            key={teacher.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5 flex flex-col justify-between hover:border-amber-400 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                    {teacher.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{teacher.fullName}</h3>
                    <p className="text-xs text-amber-700 font-semibold">{teacher.subject}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Đang công tác
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{teacher.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{teacher.phone || "---"}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Chủ nhiệm:</span>
              {teacher.homeroomClassName ? (
                <span className="font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md font-mono">
                  Lớp {teacher.homeroomClassName}
                </span>
              ) : (
                <span className="text-slate-400 italic">Không chủ nhiệm</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ADD TEACHER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Thêm Giáo Viên Mới</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
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

            <form onSubmit={handleAddTeacher} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Họ và tên giáo viên:</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Thầy Hoàng Văn Nam"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email giáo viên:</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="namhv@thcsquangchau.edu.vn"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Số điện thoại liên hệ:</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Bộ môn giảng dạy:</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Giáo dục Công dân & Kỹ năng sống">Giáo dục Công dân & Kỹ năng sống</option>
                  <option value="Khoa học Tự nhiên & STEM">Khoa học Tự nhiên & STEM</option>
                  <option value="Toán học & Tin học">Toán học & Tin học</option>
                  <option value="Ngữ văn">Ngữ văn</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                  <option value="Lịch sử & Địa lí">Lịch sử & Địa lí</option>
                  <option value="Giáo dục Thể chất & Nghệ thuật">Giáo dục Thể chất & Nghệ thuật</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Phân công chủ nhiệm lớp (nếu có):</label>
                <select
                  value={homeroomClassId}
                  onChange={(e) => setHomeroomClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Không phân công chủ nhiệm --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Lớp {c.name} (Khối {c.gradeLevel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold shadow-xs cursor-pointer"
                >
                  Lưu Giáo Viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
