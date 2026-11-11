import { useState, useMemo } from "react";
import { STUDENT_INITIATIVES, INFOGRAPHICS_DATA, MEDIA_VIDEOS, INSPIRING_QUOTES } from "../data/initiativesData";
import { contentService } from "../services/contentService";
import { MediaVideoItem, GalleryImageItem } from "../types/adminTypes";
import {
  Sparkles,
  Eye,
  Download,
  Play,
  MessageSquare,
  Heart,
  Share2,
  Award,
  CheckCircle2,
  ChevronRight,
  X,
  Image as ImageIcon,
  ZoomIn,
} from "lucide-react";

interface MediaSectionProps {
  setActiveTab: (tab: string) => void;
}

export default function MediaSection({ setActiveTab }: MediaSectionProps) {
  const [selectedInfographic, setSelectedInfographic] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<GalleryImageItem | null>(null);

  // Dynamic published videos
  const dynamicVideos = useMemo(() => {
    const list = contentService.getPublicVideos();
    return list.length > 0 ? list : [];
  }, []);

  const [selectedVideoId, setSelectedVideoId] = useState<string>(() => {
    return dynamicVideos[0]?.id || "video-1";
  });

  // Dynamic published images
  const dynamicImages = useMemo(() => {
    return contentService.getPublicImages();
  }, []);

  const activeVideo = dynamicVideos.find((v) => v.id === selectedVideoId) || dynamicVideos[0] || {
    id: "video-1",
    title: "Phim Ngắn: Bay Cao Ước Mơ Học Đường",
    description: "Bộ phim ngắn do học sinh Khối 8 và Khối 9 Trường THCS Quảng Châu tự biên kịch và đóng vai.",
    topicTitle: "Bình đẳng giới trong lựa chọn nghề nghiệp",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    youtubeId: "dQw4w9WgXcQ",
    thumbnailUrl: "/src/assets/images/hero_gender_equality_1794298223798.jpg",
    presenter: "Chi đội 8C1 & CLB Truyền Thông Măng Non",
    duration: "06:45",
  };

  const activeInfographic = INFOGRAPHICS_DATA.find((i) => i.id === selectedInfographic);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };


  return (
    <div className="space-y-12 py-6 pb-20">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Chuyên mục 5: Tiếng nói thanh thiếu niên</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Góc Lan Tỏa & Sáng Kiến Truyền Thông Số
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Không gian tôn vinh các sáng kiến, sản phẩm truyền thông số, tranh vẽ cổ động và câu chuyện tích cực của học sinh Trường THCS Quảng Châu vì một xã hội không rào cản giới.
        </p>
      </div>

      {/* Featured Campaign Banner Visual */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7 p-8 sm:p-10 space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase">
              Chiến dịch học đường 2026
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Thanh Thiếu Niên Kiến Tạo Thay Đổi Vì Bình Đẳng Giới
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Dự án do tập thể thầy và trò Trường THCS Quảng Châu, Nghệ An cùng chung tay thực hiện. Bằng các công cụ số hóa, chúng em muốn đưa tiếng nói bình đẳng tới từng lớp học, từng nếp nhà và cộng đồng quê hương.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={handleShare}
                className="px-4 py-2.5 text-xs font-bold text-slate-900 bg-amber-300 hover:bg-amber-400 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>{copiedLink ? "✓ Đã sao chép liên kết!" : "Lan tỏa trang web"}</span>
              </button>
              <button
                onClick={() => setActiveTab("commitment")}
                className="px-4 py-2.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <Heart className="w-4 h-4 text-teal-300" />
                <span>Tham gia ký cam kết</span>
              </button>
            </div>
          </div>
          <div className="lg:col-span-5 h-64 lg:h-full min-h-[280px] relative">
            <img
              src="/src/assets/images/youth_action_campaign_1794298224215.jpg"
              alt="Học sinh THCS Quảng Châu tham gia chiến dịch bình đẳng giới"
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* Part 1: Interactive Infographics Gallery */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <span>Bộ Infographic Giáo Dục Trực Quan</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Tóm tắt những kiến thức cốt lõi và kỹ năng ứng phó bạo lực học đường
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 w-fit">
            3 Bộ Infographic chuẩn hóa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {INFOGRAPHICS_DATA.map((info) => (
            <div
              key={info.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${info.badgeColor}`}>
                    {info.category}
                  </span>
                  <span className="text-xs text-slate-400">{info.readTime}</span>
                </div>
                <h4 className="text-base font-bold text-slate-900 leading-snug">
                  {info.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {info.subtitle}
                </p>

                {/* Key Points Preview */}
                <div className="space-y-2 pt-2">
                  {info.points.slice(0, 2).map((pt, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 text-xs space-y-1">
                      <p className="font-bold text-slate-800">{pt.title}</p>
                      <p className="text-slate-600 line-clamp-2">{pt.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setSelectedInfographic(info.id)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Xem chi tiết & đọc bản đầy đủ</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Infographic Modal Detail View */}
      {selectedInfographic && activeInfographic && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase">{activeInfographic.category}</span>
                <h3 className="text-xl font-extrabold text-slate-900">{activeInfographic.title}</h3>
              </div>
              <button
                onClick={() => setSelectedInfographic(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {activeInfographic.points.map((pt, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h5 className="text-sm font-bold text-slate-900">{pt.title}</h5>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 pl-8 leading-relaxed">
                    {pt.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs sm:text-sm text-teal-900 font-semibold">
              💡 {activeInfographic.summaryNote}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInfographic(null)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                Đã hiểu rõ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Part 2: Media Theater & Video Scripts */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-10 text-white space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Rạp chiếu phim học đường</span>
            <h3 className="text-2xl font-extrabold text-white">Video Truyền Thông & Phóng Sự Số</h3>
          </div>
          {/* Video Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            {dynamicVideos.map((vid) => (
              <button
                key={vid.id}
                onClick={() => {
                  setSelectedVideoId(vid.id);
                  setIsPlayingVideo(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  selectedVideoId === vid.id
                    ? "bg-teal-500 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {vid.title.length > 25 ? `${vid.title.substring(0, 25)}...` : vid.title}
              </button>
            ))}
          </div>
        </div>

        {/* Video Player Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-950 border border-teal-800 text-teal-300">
              {activeVideo.topicTitle || (activeVideo as any).theme} · {activeVideo.duration}
            </span>
            <h4 className="text-xl sm:text-2xl font-bold text-white leading-snug">
              {activeVideo.title}
            </h4>
            <p className="text-xs text-amber-300 font-medium">Thực hiện: {activeVideo.presenter}</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {activeVideo.description}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsPlayingVideo(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Xem video trực tiếp</span>
              </button>
              {activeVideo.videoUrl && (
                <a
                  href={activeVideo.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 transition-colors"
                >
                  Mở trên YouTube ↗
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 shadow-lg aspect-video flex items-center justify-center">
            {isPlayingVideo ? (
              activeVideo.youtubeId || (activeVideo.videoUrl && activeVideo.videoUrl.includes("youtube")) ? (
                <iframe
                  src={contentService.getYouTubeEmbedUrl(activeVideo.videoUrl) + "?autoplay=1"}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <video src={activeVideo.videoUrl} controls autoPlay className="w-full h-full object-contain">
                  Trình duyệt không hỗ trợ xem video.
                </video>
              )
            ) : (
              <div
                onClick={() => setIsPlayingVideo(true)}
                className="relative w-full h-full group cursor-pointer"
              >
                <img
                  src={activeVideo.thumbnailUrl || "/src/assets/images/stem_and_dreams_1794298224995.jpg"}
                  alt={activeVideo.title}
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/50 flex flex-col items-center justify-center p-6 text-center space-y-3 group-hover:bg-slate-950/30 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/50 group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 fill-current ml-1" />
                  </div>
                  <p className="text-sm font-bold text-white">Bấm để xem video</p>
                  <p className="text-xs text-slate-300 font-mono">{activeVideo.duration || "05:00"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Part 3: Photo Gallery of Student Creative Campaigns */}
      {dynamicImages.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-amber-600" />
                <span>Thư Viện Ảnh & Tranh Cổ Động Học Đường</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Các tác phẩm tranh vẽ, mô hình STEM và hình ảnh hoạt động bình đẳng giới của học sinh THCS Quảng Châu
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 w-fit">
              {dynamicImages.length} tác phẩm tư liệu
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {dynamicImages.map((img) => (
              <div
                key={img.id}
                onClick={() => setLightboxImage(img)}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <img
                    src={img.imageUrl}
                    alt={img.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition-colors flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-white/90 text-slate-900 opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-md transition-opacity">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-950/70 text-white text-[10px] font-bold backdrop-blur-xs">
                    {img.albumName}
                  </span>
                </div>
                <div className="p-4 space-y-1.5 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-1">
                    {img.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {img.caption || "Ảnh tư liệu giáo dục học đường"}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100 mt-2">
                    Nguồn: <strong className="text-slate-600">{img.sourceCredit}</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Public Users */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-3xl max-w-4xl w-full overflow-hidden text-white shadow-2xl border border-slate-800"
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase">
                  {lightboxImage.albumName} · {lightboxImage.topicTitle}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{lightboxImage.title}</h3>
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[65vh] bg-black flex items-center justify-center p-2">
              <img
                src={lightboxImage.imageUrl}
                alt={lightboxImage.title}
                className="max-h-[60vh] max-w-full object-contain"
              />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs space-y-1">
              <p className="text-slate-300 leading-relaxed">{lightboxImage.caption}</p>
              <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-800">
                <span>Nguồn / Bản quyền: <strong className="text-slate-300">{lightboxImage.sourceCredit}</strong></span>
                <span>Trường THCS Quảng Châu</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Part 3: Student Creative Initiatives Gallery */}
      <div className="space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-2xl font-extrabold text-slate-900">
            Sáng Kiến Học Sinh Trường THCS Quảng Châu
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Các mô hình và sản phẩm truyền thông do học sinh nhà trường trực tiếp khởi xướng và lan tỏa
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {STUDENT_INITIATIVES.map((init) => (
            <div
              key={init.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-teal-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  {init.type}
                </span>
                <span className="text-xs font-semibold text-slate-500">{init.grade} · {init.unit}</span>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900">{init.title}</h4>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Tác giả: {init.author}</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{init.description}</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Kết quả & Tác động học đường:</span>
                </p>
                <p>{init.impact}</p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                {init.highlights.map((h, hIdx) => (
                  <span key={hIdx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    ✓ {h}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Part 4: Official Open Educational Dataset Box */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white border border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Kho Dữ Liệu Giáo Dục Mở · Phiên Bản 1.0
            </span>
            <h4 className="text-lg sm:text-xl font-bold text-white">
              Kho Dữ Liệu Bình Đẳng Giới – Trường THCS Quảng Châu
            </h4>
            <p className="text-xs text-slate-300">
              Căn cứ pháp lý: Luật Bình đẳng giới 73/2006/QH11 & Công văn 4422/SGD&ĐT-TCCB ngày 04/11/2026.
            </p>
          </div>
          <a
            href="/assets/aistudio/Kho_du_lieu_Binh_dang_gioi_THCS_Quang_Chau_b7dc824c.json"
            download="Kho_du_lieu_Binh_dang_gioi_THCS_Quang_Chau_b7dc824c.json"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md shrink-0 w-fit cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Tải tệp JSON nguồn (36KB)</span>
          </a>
        </div>
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 leading-relaxed font-mono">
          Tệp: public/assets/aistudio/Kho_du_lieu_Binh_dang_gioi_THCS_Quang_Chau_b7dc824c.json · Gồm 6 chủ đề, 30 câu hỏi trắc nghiệm chuẩn mực, 10 tình huống thực tế giáo dục học đường.
        </div>
      </div>
    </div>
  );
}
