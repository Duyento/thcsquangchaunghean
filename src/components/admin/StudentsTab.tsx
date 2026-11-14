import { useState } from "react";
import { adminService } from "../../services/adminService";
import { Student, SchoolClass, UserAccount, Grade } from "../../types/adminTypes";
import * as XLSX from "xlsx";
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

interface StudentsTabProps {
  currentUser: UserAccount;
}

interface ExcelRowError {
  row: number;
  code: string;
  name: string;
  errors: string[];
}

function gradeScopeKey(grade: Pick<Grade, "schoolId" | "academicYear" | "id">): string {
  return JSON.stringify([grade.schoolId, grade.academicYear, grade.id]);
}

function classScopeKey(schoolClass: Pick<SchoolClass, "schoolId" | "academicYear" | "id">): string {
  return JSON.stringify([schoolClass.schoolId, schoolClass.academicYear, schoolClass.id]);
}

export default function StudentsTab({ currentUser }: StudentsTabProps) {
  const [students, setStudents] = useState<Student[]>(() => adminService.getStudents(currentUser));
  const classes: SchoolClass[] = adminService.getClasses();
  const grades: Grade[] = adminService.getGradesForSchool();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const selectedGrade = grades.find((grade) => gradeScopeKey(grade) === gradeFilter);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [transferringStudent, setTransferringStudent] = useState<Student | null>(null);
  const [showExcelModal, setShowExcelModal] = useState(false);

  // Add / Edit Form States
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"nam" | "nu">("nu");
  const [birthDate, setBirthDate] = useState("2012-05-15");
  const [classId, setClassId] = useState(classes[0]?.id || "");
  const [parentPhone, setParentPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Transfer state
  const [targetClassId, setTargetClassId] = useState("");

  // Excel Import States
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [excelErrors, setExcelErrors] = useState<ExcelRowError[]>([]);
  const [excelImporting, setExcelImporting] = useState(false);

  const canManageStudents = adminService.hasPermission(currentUser, "manage_students");

  const refreshList = () => {
    setStudents(adminService.getStudents(currentUser));
  };

  // Filter logic
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.parentPhone && s.parentPhone.includes(searchQuery));

    const studentClass = classes.find(
      (schoolClass) =>
        schoolClass.id === s.classId
        && schoolClass.schoolId === s.schoolId
        && schoolClass.academicYear === s.academicYear
    );
    const matchesGrade = gradeFilter === "all" || Boolean(
      selectedGrade
      && studentClass
      && studentClass.schoolId === selectedGrade.schoolId
      && studentClass.academicYear === selectedGrade.academicYear
      && studentClass.gradeId === selectedGrade.id
      && studentClass.gradeLevel === selectedGrade.level
    );
    const matchesClass = classFilter === "all"
      || classScopeKey({ id: s.classId, schoolId: s.schoolId, academicYear: s.academicYear }) === classFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "locked" && s.status === "locked") ||
      (statusFilter === "studying" && (s.status === "studying" || !s.status));

    return matchesSearch && matchesGrade && matchesClass && matchesStatus;
  });

  // 1. ADD STUDENT
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!fullName.trim() || !studentCode.trim() || !classId) {
      setFormError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    let res;
    try {
      res = await adminService.createStudent(currentUser, {
        fullName: fullName.trim(),
        studentCode: studentCode.trim().toUpperCase(),
        gender,
        birthDate,
        classId,
        parentPhone: parentPhone.trim(),
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể thêm học sinh.");
      return;
    }

    if (res.success) {
      refreshList();
      setShowAddModal(false);
      setFullName("");
      setStudentCode("");
      setParentPhone("");
      setActionSuccess(`Đã thêm thành công học sinh ${res.student?.fullName}!`);
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể thêm học sinh.");
    }
  };

  // 2. EDIT STUDENT
  const openEditModal = (st: Student) => {
    setEditingStudent(st);
    setStudentCode(st.studentCode);
    setFullName(st.fullName);
    setGender(st.gender);
    setBirthDate(st.birthDate);
    setParentPhone(st.parentPhone || "");
    setFormError("");
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setFormError("");

    let res;
    try {
      res = await adminService.updateStudent(currentUser, editingStudent.id, {
        studentCode: studentCode.trim().toUpperCase(),
        fullName: fullName.trim(),
        gender,
        birthDate,
        parentPhone: parentPhone.trim(),
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật thông tin.");
      return;
    }

    if (res.success) {
      refreshList();
      setEditingStudent(null);
      setActionSuccess(`Đã cập nhật thông tin học sinh ${res.student?.fullName}!`);
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể cập nhật thông tin.");
    }
  };

  // 3. LOCK / UNLOCK STUDENT
  const handleToggleLock = async (st: Student) => {
    const isLocked = st.status === "locked";
    const confirmMsg = isLocked
      ? `Bạn có chắc muốn MỞ KHÓA tài khoản học sinh "${st.fullName}" (${st.studentCode})?`
      : `Bạn có chắc muốn KHÓA tài khoản học sinh "${st.fullName}" (${st.studentCode})? Học sinh sẽ không thể đăng nhập hoặc tham gia các hoạt động bình đẳng giới.`;

    if (!window.confirm(confirmMsg)) return;

    let res;
    try {
      res = await adminService.toggleStudentLock(currentUser, st.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể thực hiện thao tác.");
      return;
    }
    if (res.success) {
      refreshList();
      setActionSuccess(`${res.newStatus === "locked" ? "Đã khóa" : "Đã mở khóa"} thành công tài khoản học sinh!`);
      setTimeout(() => setActionSuccess(""), 3000);
    } else {
      alert(res.error || "Không thể thực hiện thao tác.");
    }
  };

  // 4. TRANSFER STUDENT
  const handleTransferStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringStudent || !targetClassId) return;
    setFormError("");

    let res;
    try {
      res = await adminService.transferStudent(currentUser, transferringStudent.id, targetClassId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể chuyển lớp.");
      return;
    }
    if (res.success) {
      refreshList();
      setTransferringStudent(null);
      setTargetClassId("");
      setActionSuccess(`Đã chuyển thành công học sinh ${transferringStudent.fullName} sang lớp mới!`);
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể chuyển lớp.");
    }
  };

  // 5. EXPORT EXCEL
  const handleExportExcel = () => {
    const exportData = filteredStudents.map((s, idx) => ({
      STT: idx + 1,
      "Mã học sinh": s.studentCode,
      "Họ và tên": s.fullName,
      "Giới tính": s.gender === "nam" ? "Nam" : "Nữ",
      "Ngày sinh": s.birthDate,
      Khối: s.gradeLevel,
      Lớp: s.className,
      "Năm học": s.academicYear,
      "SĐT phụ huynh": s.parentPhone || "",
      "Trạng thái": s.status === "locked" ? "Tạm khóa" : s.status === "transferred" ? "Đã chuyển" : "Đang học",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachHocSinh");
    XLSX.writeFile(workbook, `Danh_sach_hoc_sinh_THCS_Quang_Chau_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 6. DOWNLOAD EXCEL SAMPLE TEMPLATE
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        "Mã học sinh": "HS-2026-101",
        "Họ và tên": "Nguyễn Hoàng Nam",
        "Giới tính": "Nam",
        "Ngày sinh": "2012-04-12",
        Khối: 6,
        Lớp: "6A1",
        "SĐT phụ huynh": "0912345678",
      },
      {
        "Mã học sinh": "HS-2026-102",
        "Họ và tên": "Trần Khánh Linh",
        "Giới tính": "Nữ",
        "Ngày sinh": "2012-08-25",
        Khối: 6,
        Lớp: "6A1",
        "SĐT phụ huynh": "0987654321",
      },
      {
        "Mã học sinh": "HS-2026-103",
        "Họ và tên": "Lê Văn Minh",
        "Giới tính": "Nam",
        "Ngày sinh": "2011-03-18",
        Khối: 7,
        Lớp: "7A1",
        "SĐT phụ huynh": "0901234567",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MauNhapHocSinh");
    XLSX.writeFile(workbook, "Mau_nhap_danh_sach_hoc_sinh_THCS_Quang_Chau.xlsx");
  };

  // 7. HANDLE EXCEL FILE UPLOAD & VALIDATION (PREVIEW & LINE ERROR REPORTING)
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security check: Extension must be xlsx or xls or csv
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (![".xlsx", ".xls", ".csv"].includes(ext)) {
      alert("Chỉ chấp nhận tệp định dạng Excel (.xlsx, .xls) hoặc .csv!");
      return;
    }

    setExcelFile(file);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (data.length === 0) {
          alert("Tệp Excel rỗng hoặc không có dữ liệu!");
          return;
        }

        // Check required column headers
        const firstRow = data[0];
        const requiredHeaders = ["Mã học sinh", "Họ và tên", "Giới tính", "Ngày sinh", "Khối", "Lớp"];
        const missingHeaders = requiredHeaders.filter((h) => !(h in firstRow));

        if (missingHeaders.length > 0) {
          alert(`Tệp Excel thiếu các cột bắt buộc: ${missingHeaders.join(", ")}. Vui lòng dùng tệp mẫu quy định.`);
          return;
        }

        // Validate each row
        const currentStudentCodes = new Set(students.map((s) => s.studentCode.toUpperCase()));
        const seenInFileCodes = new Set<string>();
        const errors: ExcelRowError[] = [];
        const valids: any[] = [];

        data.forEach((row, index) => {
          const rowNum = index + 2; // header is row 1
          const code = String(row["Mã học sinh"] || "").trim().toUpperCase();
          const name = String(row["Họ và tên"] || "").trim();
          const genderRaw = String(row["Giới tính"] || "").trim().toLowerCase();
          const birth = String(row["Ngày sinh"] || "").trim();
          const gradeRaw = Number(row["Khối"]);
          const classNameRaw = String(row["Lớp"] || "").trim().toUpperCase();
          const phone = String(row["SĐT phụ huynh"] || "").trim();

          const rowErrors: string[] = [];

          // 1. Check required fields
          if (!code) rowErrors.push("Thiếu 'Mã học sinh'");
          if (!name) rowErrors.push("Thiếu 'Họ và tên'");
          if (!birth) rowErrors.push("Thiếu 'Ngày sinh'");
          if (!genderRaw) rowErrors.push("Thiếu 'Giới tính'");
          if (!classNameRaw) rowErrors.push("Thiếu 'Lớp'");

          // 2. Check duplicate code in file
          if (code) {
            if (seenInFileCodes.has(code)) {
              rowErrors.push(`Trùng mã học sinh trong tệp (${code})`);
            } else {
              seenInFileCodes.add(code);
            }

            // 3. Check duplicate code with existing database
            if (currentStudentCodes.has(code)) {
              rowErrors.push(`Mã học sinh (${code}) đã tồn tại trên hệ thống`);
            }
          }

          // 4. Validate gender
          let parsedGender: "nam" | "nu" = "nu";
          if (genderRaw === "nam" || genderRaw === "m" || genderRaw === "male") {
            parsedGender = "nam";
          } else if (genderRaw === "nữ" || genderRaw === "nu" || genderRaw === "f" || genderRaw === "female") {
            parsedGender = "nu";
          } else if (genderRaw) {
            rowErrors.push(`Giới tính "${genderRaw}" không hợp lệ (nhập 'Nam' hoặc 'Nữ')`);
          }

          // 5. Check if class exists in system
          const matchedClass = classes.find(
            (c) => c.name.toUpperCase() === classNameRaw && (isNaN(gradeRaw) || c.gradeLevel === gradeRaw)
          );

          if (!matchedClass) {
            rowErrors.push(`Lớp "${classNameRaw}" (Khối ${gradeRaw || "?"}) không tồn tại trong hệ thống trường`);
          }

          if (rowErrors.length > 0) {
            errors.push({
              row: rowNum,
              code: code || `Dòng ${rowNum}`,
              name: name || "Chưa có tên",
              errors: rowErrors,
            });
          } else if (matchedClass) {
            valids.push({
              studentCode: code,
              fullName: name,
              gender: parsedGender,
              birthDate: birth,
              gradeLevel: matchedClass.gradeLevel,
              classId: matchedClass.id,
              className: matchedClass.name,
              parentPhone: phone,
            });
          }
        });

        setParsedRows(data);
        setExcelErrors(errors);
        setValidRows(valids);
      } catch (err) {
        console.error(err);
        alert("Lỗi khi đọc tệp Excel. Vui lòng kiểm tra định dạng tệp.");
      }
    };

    reader.readAsBinaryString(file);
  };

  // 8. CONFIRM EXCEL IMPORT (Never overwrite without confirmation)
  const handleConfirmExcelImport = async () => {
    if (validRows.length === 0) {
      alert("Không có dòng hợp lệ nào để nhập!");
      return;
    }

    setExcelImporting(true);
    let res;
    try {
      res = await adminService.bulkImportStudents(currentUser, validRows);
    } catch (error) {
      setExcelImporting(false);
      alert(error instanceof Error ? error.message : "Không thể nhập dữ liệu.");
      return;
    }
    setExcelImporting(false);

    if (res.success) {
      refreshList();
      setShowExcelModal(false);
      setExcelFile(null);
      setParsedRows([]);
      setValidRows([]);
      setExcelErrors([]);
      setActionSuccess(`Đã nhập thành công ${res.count} học sinh vào hệ thống!`);
      setTimeout(() => setActionSuccess(""), 4000);
    } else {
      alert(res.error || "Không thể nhập dữ liệu.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-sky-600" />
            <span>Quản Lý Hồ Sơ Học Sinh & Phân Lớp</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý mã học sinh, cập nhật thông tin, khóa tài khoản, chuyển lớp và nhập/xuất dữ liệu Excel chuẩn hóa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Xuất danh sách học sinh ra tệp Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel ({filteredStudents.length})</span>
          </button>

          {canManageStudents && (
            <>
              {/* Import Excel Button */}
              <button
                onClick={() => {
                  setShowExcelModal(true);
                  setExcelFile(null);
                  setParsedRows([]);
                  setValidRows([]);
                  setExcelErrors([]);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nhập Từ Excel</span>
              </button>

              {/* Add Student Button */}
              <button
                onClick={() => {
                  setShowAddModal(true);
                  setFormError("");
                }}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-sky-600 hover:bg-sky-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Học Sinh</span>
              </button>
            </>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Multi-filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo họ tên, mã học sinh, số ĐT..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50"
            />
          </div>

          {/* Grade Filter */}
          <div className="lg:col-span-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value);
                setClassFilter("all");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value="all">Tất cả Khối</option>
              {grades.map((g) => (
                <option key={gradeScopeKey(g)} value={gradeScopeKey(g)}>
                  Khối {g.level} · {g.academicYear}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div className="lg:col-span-3 flex items-center gap-1.5">
            <span className="text-xs text-slate-500 shrink-0">Lớp:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value="all">Tất cả các lớp</option>
              {classes
                .filter((schoolClass) => gradeFilter === "all" || Boolean(
                  selectedGrade
                  && schoolClass.schoolId === selectedGrade.schoolId
                  && schoolClass.academicYear === selectedGrade.academicYear
                  && schoolClass.gradeId === selectedGrade.id
                  && schoolClass.gradeLevel === selectedGrade.level
                ))
                .map((c) => (
                  <option key={classScopeKey(c)} value={classScopeKey(c)}>
                    Lớp {c.name} ({c.studentCount} hs)
                  </option>
                ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2 flex items-center gap-1.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="studying">Đang học</option>
              <option value="locked">Tạm khóa</option>
            </select>
          </div>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Hiển thị <strong>{filteredStudents.length}</strong> / {students.length} học sinh
          </span>
          {gradeFilter !== "all" || classFilter !== "all" || searchQuery || statusFilter !== "all" ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setGradeFilter("all");
                setClassFilter("all");
                setStatusFilter("all");
              }}
              className="text-sky-600 font-bold hover:underline cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          ) : null}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã Học Sinh</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4">Giới Tính</th>
                <th className="py-3 px-4">Khối / Lớp</th>
                <th className="py-3 px-4">Ngày Sinh</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">SĐT Phụ Huynh</th>
                {canManageStudents && <th className="py-3 px-4 text-right">Thao Tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center space-y-2">
                    <p className="text-sm font-semibold text-slate-600">Không tìm thấy học sinh nào phù hợp.</p>
                    <p className="text-xs text-slate-400">
                      Thầy cô có thể thêm học sinh mới hoặc nhập nhanh danh sách từ tệp Excel.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st.id} className={`hover:bg-slate-50/80 transition-colors ${st.status === "locked" ? "bg-rose-50/30" : ""}`}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {st.studentCode}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {st.fullName}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        st.gender === "nam" ? "bg-blue-50 text-blue-700" : "bg-teal-50 text-teal-700"
                      }`}>
                        {st.gender === "nam" ? "Nam" : "Nữ"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-mono">
                        Lớp {st.className} (K{st.gradeLevel})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {st.birthDate}
                    </td>
                    <td className="py-3 px-4">
                      {st.status === "locked" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" />
                          <span>Tạm khóa</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Đang học</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {st.parentPhone || "---"}
                    </td>

                    {canManageStudents && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Sửa thông tin */}
                          <button
                            onClick={() => openEditModal(st)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-sky-50 transition-colors"
                            title="Chỉnh sửa thông tin học sinh"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Khóa / Mở khóa tài khoản */}
                          <button
                            onClick={() => handleToggleLock(st)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              st.status === "locked"
                                ? "text-emerald-700 hover:bg-emerald-50"
                                : "text-amber-600 hover:bg-amber-50"
                            }`}
                            title={st.status === "locked" ? "Mở khóa tài khoản" : "Khóa tài khoản học sinh"}
                          >
                            {st.status === "locked" ? (
                              <Unlock className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Chuyển Lớp */}
                          <button
                            onClick={() => {
                              setTransferringStudent(st);
                              setTargetClassId("");
                              setFormError("");
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Chuyển lớp"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Chuyển</span>
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

      {/* ==================== MODAL: ADD STUDENT ==================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-600" />
                <span>Thêm Hồ Sơ Học Sinh Mới</span>
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

            <form onSubmit={handleAddStudent} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mã học sinh (*):</label>
                <input
                  type="text"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="Ví dụ: HS-2026-001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Họ và tên học sinh (*):</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Hưng"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Giới tính:</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "nam" | "nu")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="nu">Nữ</option>
                    <option value="nam">Nam</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ngày sinh:</label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Xếp vào lớp (*):</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Lớp {c.name} (Khối {c.gradeLevel} · Sĩ số: {c.studentCount} hs)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Số điện thoại phụ huynh:</label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="Ví dụ: 0987654321"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
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
                  className="px-4 py-2 rounded-xl text-white bg-sky-600 hover:bg-sky-700 font-bold shadow-xs cursor-pointer"
                >
                  Lưu Học Sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT STUDENT ==================== */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-600" />
                <span>Sửa Thông Tin Học Sinh</span>
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
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

            <form onSubmit={handleUpdateStudent} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mã học sinh (*):</label>
                <input
                  type="text"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Họ và tên (*):</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Giới tính:</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "nam" | "nu")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="nu">Nữ</option>
                    <option value="nam">Nam</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ngày sinh:</label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-500">Lớp hiện tại:</span>{" "}
                <strong className="text-teal-800">Lớp {editingStudent.className} (Khối {editingStudent.gradeLevel})</strong>
                <p className="text-[11px] text-slate-400">Để chuyển lớp, vui lòng dùng chức năng "Chuyển Lớp" chuyên dụng.</p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Số điện thoại phụ huynh:</label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white bg-sky-600 hover:bg-sky-700 font-bold shadow-xs cursor-pointer"
                >
                  Cập Nhật Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: TRANSFER STUDENT ==================== */}
      {transferringStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                <span>Chuyển Lớp Cho Học Sinh</span>
              </h3>
              <button
                onClick={() => setTransferringStudent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-800">{transferringStudent.fullName}</p>
              <p className="text-slate-600">
                Mã: <span className="font-mono">{transferringStudent.studentCode}</span> · Lớp hiện tại:{" "}
                <strong className="text-teal-800">Lớp {transferringStudent.className}</strong>
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleTransferStudent} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Chọn lớp chuyển đến:</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn lớp đích --</option>
                  {classes
                    .filter((c) => c.id !== transferringStudent.classId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Lớp {c.name} (Khối {c.gradeLevel} · Sĩ số hiện tại: {c.studentCount} hs)
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Hệ thống tự động cập nhật sĩ số của lớp cũ và lớp mới, đồng thời ghi lại nhật ký điều chuyển.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransferringStudent(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!targetClassId}
                  className="px-4 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Xác Nhận Chuyển Lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EXCEL IMPORT WITH PREVIEW & LINE ERROR REPORTING ==================== */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>Nhập Danh Sách Học Sinh Từ Excel</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kiểm tra cấu trúc cột, trùng lặp mã học sinh, xác thực lớp học và báo lỗi chi tiết từng dòng
                </p>
              </div>
              <button
                onClick={() => setShowExcelModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template download & upload zone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Download sample */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Bước 1: Tải tệp mẫu Excel</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Tệp mẫu chuẩn bao gồm các cột: <strong>Mã học sinh, Họ và tên, Giới tính, Ngày sinh, Khối, Lớp, SĐT phụ huynh</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải tệp mẫu (.xlsx)</span>
                </button>
              </div>

              {/* Upload file */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2.5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>Bước 2: Chọn tệp Excel để nhập</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Hệ thống sẽ tự động quét, kiểm tra trùng lặp và phân tích lỗi từng dòng trước khi lưu.
                  </p>
                </div>
                <label className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{excelFile ? `Đổi tệp (${excelFile.name})` : "Tải tệp lên..."}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Validation summary banner */}
            {parsedRows.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                    <p className="text-xs text-slate-500">Tổng dòng đọc được</p>
                    <p className="text-xl font-extrabold text-slate-900">{parsedRows.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-xs text-emerald-700 font-semibold">Hợp lệ để nhập</p>
                    <p className="text-xl font-extrabold text-emerald-700">{validRows.length}</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${excelErrors.length > 0 ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                    <p className="text-xs font-semibold">Dòng có lỗi</p>
                    <p className="text-xl font-extrabold">{excelErrors.length}</p>
                  </div>
                </div>

                {/* LINE ERROR REPORTING SECTION */}
                {excelErrors.length > 0 && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                    <h5 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Phát hiện {excelErrors.length} dòng có lỗi (các dòng này sẽ bị bỏ qua):</span>
                    </h5>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs text-rose-800 pr-2">
                      {excelErrors.map((err, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-white/70 border border-rose-200/60">
                          <span className="font-bold font-mono">Dòng {err.row}</span> ({err.code} - {err.name}):{" "}
                          <span className="text-rose-900">{err.errors.join("; ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PREVIEW TABLE OF VALID ROWS */}
                {validRows.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-emerald-600" />
                      <span>Bản xem trước dữ liệu hợp lệ chuẩn bị nhập ({validRows.length} học sinh):</span>
                    </h5>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Mã HS</th>
                            <th className="py-2 px-3">Họ và Tên</th>
                            <th className="py-2 px-3">Giới tính</th>
                            <th className="py-2 px-3">Lớp xếp</th>
                            <th className="py-2 px-3">Ngày sinh</th>
                            <th className="py-2 px-3">SĐT Phụ huynh</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {validRows.slice(0, 15).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 font-mono font-bold">{row.studentCode}</td>
                              <td className="py-1.5 px-3">{row.fullName}</td>
                              <td className="py-1.5 px-3">{row.gender === "nam" ? "Nam" : "Nữ"}</td>
                              <td className="py-1.5 px-3 font-semibold text-teal-800">Lớp {row.className}</td>
                              <td className="py-1.5 px-3 text-slate-500">{row.birthDate}</td>
                              <td className="py-1.5 px-3 font-mono text-slate-500">{row.parentPhone || "---"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {validRows.length > 15 && (
                      <p className="text-[11px] text-slate-400 italic">
                        (Đang hiển thị 15 dòng đầu tiên / tổng số {validRows.length} dòng hợp lệ)
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Nguyên tắc: Dữ liệu chỉ được lưu vào hệ thống khi quản trị viên bấm nút xác nhận.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowExcelModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer text-xs"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExcelImport}
                  disabled={validRows.length === 0 || excelImporting}
                  className="px-5 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-bold shadow-xs cursor-pointer text-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận Nhập ({validRows.length} Học Sinh)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
