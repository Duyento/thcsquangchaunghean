import { useState } from "react";
import { adminService } from "../../services/adminService";
import { Grade, SchoolClass, UserAccount } from "../../types/adminTypes";
import { Layers, School, Users, ArrowRight } from "lucide-react";

interface GradesTabProps {
  currentUser?: UserAccount;
  onSelectGrade?: (grade: Grade) => void;
}

export default function GradesTab({ currentUser: _currentUser, onSelectGrade }: GradesTabProps) {
  const school = adminService.getSchool();
  const [grades] = useState<Grade[]>(() => adminService.getGrades(school.id, school.academicYear));
  const classes: SchoolClass[] = adminService.getClasses();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Quản Lý Khối Học (Cấp THCS)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Các khối đào tạo chính thức · Năm học {school.academicYear}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {grades.map((grade) => {
          const gradeClasses = classes.filter(
            (c) =>
              c.schoolId === grade.schoolId
              && c.academicYear === grade.academicYear
              && c.gradeId === grade.id
              && c.status !== "archived"
          );
          const totalStudents = gradeClasses.reduce(
            (sum, c) => sum + (c.studentCount || 0),
            0
          );

          return (
            <div
              key={`${grade.schoolId}:${grade.academicYear}:${grade.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-teal-400 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-extrabold text-lg">
                    {grade.level}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{grade.name}</h3>
                    <span className="text-xs text-slate-500 font-medium">
                      Năm học: {grade.academicYear}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Đang hoạt động
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                {grade.description}
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-center text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-extrabold text-lg text-slate-900">{gradeClasses.length}</p>
                  <p className="text-slate-500 font-medium">Lớp học</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-extrabold text-lg text-slate-900">{totalStudents}</p>
                  <p className="text-slate-500 font-medium">Học sinh</p>
                </div>
              </div>

              {/* Class tags preview */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block">Các lớp trực thuộc:</span>
                <div className="flex flex-wrap gap-1.5">
                  {gradeClasses.map((c) => (
                    <span
                      key={c.id}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200"
                    >
                      {c.name} ({c.studentCount} hs)
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => onSelectGrade?.(grade)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem & quản lý lớp Khối {grade.level}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
