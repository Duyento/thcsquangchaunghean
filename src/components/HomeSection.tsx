import { ArrowRight, BookOpen, Award, HeartHandshake, Compass, Sparkles, CheckCircle2, Play, Users, Star, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { MEDIA_VIDEOS, INSPIRING_QUOTES } from "../data/initiativesData";

interface HomeSectionProps {
  setActiveTab: (tab: string) => void;
}

export default function HomeSection({ setActiveTab }: HomeSectionProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const pillars = [
    {
      id: "knowledge",
      title: "Hiểu đúng về Giới",
      desc: "Phân biệt Giới và Giới tính, xóa tan những quan niệm sai lầm về năng lực và màu sắc.",
      icon: Compass,
      color: "from-blue-500 to-blue-600",
      badge: "6 Chủ đề",
    },
    {
      id: "situations",
      title: "Góc tình huống",
      desc: "10 câu chuyện thực tế tại trường lớp, gia đình và trên mạng để em rèn luyện bản lĩnh ứng xử.",
      icon: BookOpen,
      color: "from-teal-500 to-teal-600",
      badge: "10 Tình huống",
    },
    {
      id: "quiz",
      title: "Thử thách trắc nghiệm",
      desc: "30 câu hỏi chuẩn hóa có đáp án giải thích chi tiết, chấm điểm tự động và nhận danh hiệu.",
      icon: Award,
      color: "from-indigo-500 to-blue-600",
      badge: "30 Câu hỏi",
    },
    {
      id: "media",
      title: "Góc lan tỏa & Sáng kiến",
      desc: "Trưng bày tranh vẽ cổ động số, infographic, podcast và phóng sự truyền thông của học sinh.",
      icon: Sparkles,
      color: "from-amber-500 to-orange-500",
      badge: "Sáng tạo số",
    },
    {
      id: "commitment",
      title: "Em cam kết hành động",
      desc: "Gửi gắm lời hứa thay đổi, nhận giấy chứng nhận Đại sứ Bình đẳng giới mang tên mình.",
      icon: HeartHandshake,
      color: "from-emerald-500 to-teal-600",
      badge: "Hành động ngay",
    },
  ];

  const currentVideo = MEDIA_VIDEOS.find((v) => v.id === selectedVideo);

  return (
    <div className="space-y-16 py-6 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-teal-900 to-slate-900 text-white shadow-xl">
        <div className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* School & Contest Identity */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm text-teal-200">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="font-semibold">Trường THCS Quảng Châu, Nghệ An</span>
              <span className="text-white/40">|</span>
              <span>Sân chơi sáng tạo số</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              BÌNH ĐẲNG GIỚI <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-sky-200 to-amber-200">
                KHÔNG GIỚI HẠN ƯỚC MƠ
              </span>
            </h1>

            {/* Slogan & Message */}
            <p className="text-lg sm:text-xl font-medium text-amber-200 max-w-xl mx-auto lg:mx-0">
              "Tôn trọng sự khác biệt – Bình đẳng cơ hội – Cùng nhau phát triển"
            </p>

            {/* Sub-text */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Chào mừng các bạn học sinh khối 6, 7, 8, 9 đến với không gian học tập và tương tác số vì bình đẳng giới. Nơi mọi ước mơ khoa học, nghệ thuật và thể thao đều được chắp cánh mà không bị rào cản bởi bất kỳ định kiến nào!
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => setActiveTab("quiz")}
                className="px-6 py-3 text-sm font-bold text-slate-900 bg-gradient-to-r from-amber-300 to-yellow-400 hover:from-amber-400 hover:to-yellow-500 rounded-xl shadow-lg shadow-amber-400/20 flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer"
              >
                <Award className="w-5 h-5 text-slate-900" />
                <span>Bắt đầu thử thách 30 câu</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveTab("situations")}
                className="px-6 py-3 text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-5 h-5 text-teal-300" />
                <span>Khám phá 10 tình huống</span>
              </button>

              <button
                onClick={() => setActiveTab("commitment")}
                className="px-6 py-3 text-sm font-bold text-teal-200 hover:text-white bg-teal-950/60 hover:bg-teal-900/80 border border-teal-500/30 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <HeartHandshake className="w-5 h-5 text-teal-400" />
                <span>Ký cam kết hành động</span>
              </button>
            </div>

            {/* Trust points */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>100% Miễn phí & Không cần đăng nhập</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Không thu thập dữ liệu cá nhân</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Thiết kế riêng cho học sinh THCS</span>
              </div>
            </div>
          </div>

          {/* Hero Banner Visual Asset */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-800 group">
              <img
                src="/src/assets/images/hero_gender_equality_1794298223798.jpg"
                alt="Học sinh THCS Quảng Châu cùng nhau học tập và ước mơ bình đẳng giới"
                className="w-full h-auto object-cover transform group-hover:scale-102 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
                <div className="text-white text-xs sm:text-sm">
                  <p className="font-bold text-amber-200">Ước mơ không phân biệt con trai hay con gái</p>
                  <p className="text-slate-200 text-xs">Cùng nhau kiến tạo một môi trường học đường yêu thương & bình đẳng</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Statistics Strip */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-blue-600">06</p>
            <p className="text-sm font-semibold text-slate-800">Chủ đề giáo dục</p>
            <p className="text-xs text-slate-500">Từ khái niệm đến luật pháp & hành động</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-teal-600">30</p>
            <p className="text-sm font-semibold text-slate-800">Câu hỏi trắc nghiệm</p>
            <p className="text-xs text-slate-500">Có giải thích sư phạm chi tiết</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-amber-600">10</p>
            <p className="text-sm font-semibold text-slate-800">Tình huống thực tế</p>
            <p className="text-xs text-slate-500">Rèn luyện kỹ năng xử lý học đường</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-indigo-600">Khối 6-9</p>
            <p className="text-sm font-semibold text-slate-800">Học sinh THCS</p>
            <p className="text-xs text-slate-500">Trường THCS Quảng Châu, Nghệ An</p>
          </div>
        </div>
      </section>

      {/* 5 Core Feature Cards Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Khám phá 5 Khu Vực Trải Nghiệm
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Học tập chủ động, thực hành tương tác và lan tỏa năng lượng tích cực đến bạn bè
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="group relative bg-white rounded-2xl p-6 border border-slate-200 hover:border-teal-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-teal-600">
                  <span>Trải nghiệm ngay</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}

          {/* Bonus Card: Hotline & An toàn học đường */}
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white flex flex-col justify-between shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                  Khẩn cấp 24/7
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Tổng đài Quốc gia 111</h3>
                <p className="text-sm text-amber-100 mt-1 leading-relaxed">
                  Đường dây nóng miễn phí bảo vệ trẻ em khi gặp bạo lực học đường, bạo lực giới hoặc cần lắng nghe tâm sự.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t border-white/20 text-xs font-bold text-white flex items-center justify-between">
              <span>Gọi số: 111 (Miễn phí)</span>
              <span>Cục Trẻ em VN</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Video Showcase & Media Teaser */}
      <section className="bg-slate-900 rounded-3xl text-white p-6 sm:p-10 overflow-hidden relative">
        <div className="max-w-4xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Phim ngắn truyền thông giáo dục</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Ước Mơ Của Linh Và Chiếc Cờ-Lê
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Bộ phim ngắn truyền thông do nhóm học sinh Trường THCS Quảng Châu xây dựng, kể về hành trình kiên trì theo đuổi ngành chế tạo robot của một bạn nữ sinh.
          </p>

          <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 max-w-3xl mx-auto shadow-2xl">
            <img
              src="/src/assets/images/stem_and_dreams_1794298224995.jpg"
              alt="Hình ảnh phim Ước mơ của Linh và chiếc cờ-lê"
              className="w-full h-64 sm:h-80 object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-slate-950/50 flex flex-col items-center justify-center p-6 text-center">
              <button
                onClick={() => setSelectedVideo("video-1")}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-teal-500 hover:bg-teal-400 text-white flex items-center justify-center shadow-lg shadow-teal-500/50 transform hover:scale-110 active:scale-95 transition-all cursor-pointer mb-3"
                aria-label="Xem video"
              >
                <Play className="w-8 h-8 fill-current ml-1" />
              </button>
              <p className="text-base sm:text-lg font-bold text-white">Bấm để xem phim ngắn & kịch bản thông điệp</p>
              <p className="text-xs text-teal-300 mt-1">Thời lượng: 4 phút 30 giây · Phụ đề tiếng Việt</p>
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal Player / Script Reader */}
      {selectedVideo && currentVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase">{currentVideo.theme}</span>
                <h3 className="text-lg font-bold text-slate-900">{currentVideo.title}</h3>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-slate-900 text-white p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <Star className="w-4 h-4 fill-current" />
                <span>Trích đoạn kịch bản truyền cảm hứng</span>
              </div>
              <blockquote className="italic text-base sm:text-lg text-slate-200 border-l-2 border-teal-400 pl-4">
                "{currentVideo.transcriptExcerpt}"
              </blockquote>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900">Thông điệp cốt lõi từ video:</h4>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {currentVideo.keyTakeaways.map((takeaway, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setSelectedVideo(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setSelectedVideo(null);
                  setActiveTab("media");
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Xem thêm ở Góc lan tỏa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspirational Quote of the Week */}
      <section className="bg-gradient-to-r from-blue-50 via-teal-50 to-amber-50 rounded-2xl border border-teal-100 p-8 text-center max-w-4xl mx-auto space-y-4">
        <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
        <blockquote className="text-lg sm:text-xl font-bold text-slate-800 leading-relaxed max-w-2xl mx-auto">
          "{INSPIRING_QUOTES[2].quote}"
        </blockquote>
        <div className="text-xs text-slate-500 font-medium">
          <span className="font-bold text-slate-700">{INSPIRING_QUOTES[2].author}</span>
          <span className="mx-2">·</span>
          <span>{INSPIRING_QUOTES[2].title}</span>
        </div>
      </section>
    </div>
  );
}
