import { useState, useEffect } from "react";
import { PRESET_PLEDGES, INITIAL_STUDENT_PLEDGES, StudentPledge } from "../data/commitmentsData";
import { HeartHandshake, CheckCircle2, Award, Printer, Heart, Sparkles, Send, ShieldCheck, UserCheck, Star } from "lucide-react";

export default function CommitmentSection() {
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("8A");
  const [selectedPledgeIds, setSelectedPledgeIds] = useState<string[]>(["p1", "p4"]);
  const [personalMessage, setPersonalMessage] = useState("");
  const [pledgesList, setPledgesList] = useState<StudentPledge[]>([]);
  const [createdCertificate, setCreatedCertificate] = useState<StudentPledge | null>(null);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [submittedAlert, setSubmittedAlert] = useState(false);

  // Load from localStorage or initial
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bdg_student_pledges");
      if (saved) {
        setPledgesList(JSON.parse(saved));
      } else {
        setPledgesList(INITIAL_STUDENT_PLEDGES);
      }
    } catch {
      setPledgesList(INITIAL_STUDENT_PLEDGES);
    }
  }, []);

  const handleTogglePledge = (id: string) => {
    setSelectedPledgeIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleLikePledge = (pledgeId: string) => {
    setLikeCounts((prev) => ({
      ...prev,
      [pledgeId]: (prev[pledgeId] || 0) + 1,
    }));
  };

  const handleSubmitPledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert("Vui lòng nhập tên hoặc biệt danh của em nhé!");
      return;
    }
    if (selectedPledgeIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 hành động cam kết!");
      return;
    }

    const selectedTexts = PRESET_PLEDGES.filter((p) =>
      selectedPledgeIds.includes(p.id)
    ).map((p) => p.text);

    const newPledge: StudentPledge = {
      id: "pledge-" + Date.now(),
      studentName: studentName.trim(),
      schoolGrade: className.startsWith("6")
        ? "Lớp 6"
        : className.startsWith("7")
        ? "Lớp 7"
        : className.startsWith("8")
        ? "Lớp 8"
        : "Lớp 9",
      className: className.trim(),
      timestamp: "Vừa xong",
      selectedPledges: selectedTexts,
      personalMessage: personalMessage.trim() || "Em quyết tâm hành động vì bình đẳng giới!",
      avatarSeed: Math.floor(Math.random() * 5) + 1,
    };

    const updated = [newPledge, ...pledgesList];
    setPledgesList(updated);
    try {
      localStorage.setItem("bdg_student_pledges", JSON.stringify(updated));
    } catch {
      // ignore
    }

    setCreatedCertificate(newPledge);
    setSubmittedAlert(true);
    setTimeout(() => setSubmittedAlert(false), 4000);

    // Scroll to certificate
    setTimeout(() => {
      const el = document.getElementById("certificate-view");
      el?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-12 py-6 pb-20">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Chuyên mục 6: Cam kết hành động</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Em Cam Kết Hành Động Vì Bình Đẳng Giới
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Mỗi hành động nhỏ đều góp phần tạo nên sự thay đổi lớn. Hãy lựa chọn những cam kết thiết thực trong đời sống hàng ngày và nhận Thẻ Đại sứ Bình đẳng giới mang tên em!
        </p>
      </div>

      {/* Main Pledge Interactive Form */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-8">
        <form onSubmit={handleSubmitPledge} className="space-y-8">
          {/* Step 1: Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              <span>Thông Tin Của Em</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Họ và tên (hoặc biệt danh của em):</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An / Mai Linh"
                  maxLength={50}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Lớp / Chi đội (Trường THCS Quảng Châu):</label>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="6A">Chi đội 6A</option>
                  <option value="6B">Chi đội 6B</option>
                  <option value="6C">Chi đội 6C</option>
                  <option value="7A">Chi đội 7A</option>
                  <option value="7B">Chi đội 7B</option>
                  <option value="7C">Chi đội 7C</option>
                  <option value="8A">Chi đội 8A</option>
                  <option value="8B">Chi đội 8B</option>
                  <option value="8C">Chi đội 8C</option>
                  <option value="9A">Chi đội 9A</option>
                  <option value="9B">Chi đội 9B</option>
                  <option value="9C">Chi đội 9C</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Select Concrete Pledges */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                <span>Chọn Các Hành Động Em Cam Kết Thực Hiện (Tối thiểu 1)</span>
              </h3>
              <span className="text-xs font-semibold text-teal-700">
                Đã chọn: {selectedPledgeIds.length} hành động
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {PRESET_PLEDGES.map((item) => {
                const isChecked = selectedPledgeIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleTogglePledge(item.id)}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                      isChecked
                        ? "bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                      isChecked
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}>
                      {isChecked && <CheckCircle2 className="w-4 h-4 fill-current" />}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        {item.text}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Personal Message */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              <span>Lời Nhắn Gửi Hoặc Quyết Tâm Riêng Của Em (Tùy chọn)</span>
            </h3>
            <textarea
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder="Ví dụ: Em cam kết sẽ luôn giúp mẹ nấu cơm sau giờ học và cùng các bạn nam trong lớp rủ bạn nữ tham gia câu lạc bộ tin học!"
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="text-center pt-2">
            <button
              type="submit"
              className="px-8 py-3.5 text-sm font-extrabold text-white bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 rounded-xl shadow-lg shadow-teal-500/25 transition-all flex items-center gap-2 mx-auto cursor-pointer transform active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Gửi Cam Kết & Nhận Giấy Chứng Nhận Đại Sứ</span>
            </button>
          </div>
        </form>

        {submittedAlert && (
          <div className="p-4 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-sm font-bold text-center animate-bounce">
            🎉 Chúc mừng em đã gửi cam kết thành công! Thẻ chứng nhận danh dự đã được tạo bên dưới.
          </div>
        )}
      </div>

      {/* Printable Digital Certificate (Thẻ Đại Sứ Bình Đẳng Giới) */}
      {createdCertificate && (
        <div id="certificate-view" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              <span>Giấy Chứng Nhận Đại Sứ Bình Đẳng Giới Nhí</span>
            </h3>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In / Lưu file PDF</span>
            </button>
          </div>

          {/* Target for window.print() */}
          <div
            id="certificate-print-area"
            className="bg-white rounded-3xl border-4 border-amber-300 p-8 sm:p-12 shadow-xl relative overflow-hidden text-center space-y-6"
            style={{
              backgroundImage: "radial-gradient(#0284c7 0.75px, transparent 0.75px)",
              backgroundSize: "20px 20px",
            }}
          >
            {/* Corner Decorative Ornaments */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-500" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-500" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-500" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-500" />

            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-bold tracking-widest text-teal-800 uppercase">
                TRƯỜNG THCS QUẢNG CHÂU · NGHỆ AN
              </p>
              <p className="text-xs text-slate-500">
                Sân chơi: "Thanh thiếu niên kiến tạo thay đổi vì bình đẳng giới"
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-900 tracking-tight pt-2">
                CHỨNG NHẬN ĐẠI SỨ BÌNH ĐẲNG GIỚI NHÍ
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">Trân trọng trao tặng cho bạn:</p>
            </div>

            {/* Recipient */}
            <div className="py-2 border-b-2 border-t-2 border-amber-200 max-w-md mx-auto">
              <p className="text-2xl sm:text-3xl font-extrabold text-teal-700 font-serif">
                {createdCertificate.studentName}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                Chi đội: {createdCertificate.className} · {createdCertificate.schoolGrade}
              </p>
            </div>

            {/* Selected Pledges In Certificate */}
            <div className="max-w-xl mx-auto space-y-2 text-left bg-slate-50/90 p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-bold text-slate-700 uppercase text-center">
                ĐÃ CAM KẾT VÌ MÔI TRƯỜNG HỌC ĐƯỜNG BÌNH ĐẲNG:
              </p>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {createdCertificate.selectedPledges.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              {createdCertificate.personalMessage && (
                <p className="text-xs italic text-teal-800 pt-2 border-t border-slate-200">
                  "{createdCertificate.personalMessage}"
                </p>
              )}
            </div>

            {/* Signatures & Seal */}
            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto pt-4 text-xs text-slate-600">
              <div>
                <p className="font-semibold">HỌC SINH CAM KẾT</p>
                <p className="mt-8 font-bold text-slate-800">{createdCertificate.studentName}</p>
              </div>
              <div>
                <p className="font-semibold">BAN TỔ CHỨC DỰ ÁN</p>
                <div className="inline-block mt-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300 text-xs">
                  ★ THCS Quảng Châu ★
                </div>
                <p className="mt-2 text-slate-500 font-medium">Bình đẳng giới 2026</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 italic">
              "Tôn trọng sự khác biệt – Bình đẳng cơ hội – Cùng nhau phát triển"
            </p>
          </div>
        </div>
      )}

      {/* Part 2: Community Pledge Wall (Cây Cam Kết Trường Học) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              <span>Bức Tường Cam Kết – Cây Hành Động Học Đường</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Những lời hứa và quyết tâm từ các bạn học sinh khối 6, 7, 8, 9 Trường THCS Quảng Châu
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-700 w-fit">
            {pledgesList.length} Đại sứ đã đồng hành
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pledgesList.map((item) => {
            const likes = (likeCounts[item.id] || 0) + 12; // baseline peer likes
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-blue-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {item.studentName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.studentName}</h4>
                        <p className="text-xs text-slate-400">Chi đội {item.className}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{item.timestamp}</span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {item.selectedPledges.slice(0, 2).map((pledge, pIdx) => (
                      <div key={pIdx} className="text-xs text-slate-700 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{pledge}</span>
                      </div>
                    ))}
                  </div>

                  {item.personalMessage && (
                    <blockquote className="text-xs italic text-teal-800 bg-teal-50/70 p-2.5 rounded-xl border border-teal-100">
                      "{item.personalMessage}"
                    </blockquote>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-600">Đại sứ Bình đẳng giới</span>
                  <button
                    onClick={() => handleLikePledge(item.id)}
                    className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 px-2 py-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                    <span className="font-bold">{likes}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
