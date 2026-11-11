import { useState } from "react";
import { contentService } from "../../services/contentService";
import { adminService } from "../../services/adminService";
import { MediaVideoItem, UserAccount, ContentStatus } from "../../types/adminTypes";
import { OFFICIAL_TOPICS } from "../../data/officialData";
import {
  Video,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Play,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Youtube,
  Clock,
  User,
  ExternalLink,
} from "lucide-react";

interface VideosTabProps {
  currentUser: UserAccount;
}

export default function VideosTab({ currentUser }: VideosTabProps) {
  const [videos, setVideos] = useState<MediaVideoItem[]>(() =>
    contentService.getVideos(currentUser)
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<MediaVideoItem | null>(null);
  const [previewVideo, setPreviewVideo] = useState<MediaVideoItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topicId, setTopicId] = useState<number>(1);
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [presenter, setPresenter] = useState("Trường THCS Quảng Châu");
  const [duration, setDuration] = useState("05:00");
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const canManageVideos = adminService.hasPermission(currentUser, "manage_videos");
  const isSuperAdmin = currentUser.role === "super_admin";

  const refreshList = () => {
    setVideos(contentService.getVideos(currentUser));
  };

  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.presenter.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = topicFilter === 0 || v.topicId === topicFilter;
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesTopic && matchesStatus;
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTopicId(1);
    setVideoUrl("");
    setThumbnailUrl("");
    setPresenter("Trường THCS Quảng Châu");
    setDuration("05:00");
    setFormError("");
  };

  const openCreate = () => {
    resetForm();
    setEditingVideo(null);
    setShowAddModal(true);
  };

  const openEdit = (v: MediaVideoItem) => {
    setEditingVideo(v);
    setTitle(v.title);
    setDescription(v.description);
    setTopicId(v.topicId);
    setVideoUrl(v.videoUrl);
    setThumbnailUrl(v.thumbnailUrl);
    setPresenter(v.presenter);
    setDuration(v.duration || "05:00");
    setFormError("");
    setShowAddModal(true);
  };

  const handleSave = (targetStatus: ContentStatus) => {
    setFormError("");
    if (!title.trim() || !videoUrl.trim()) {
      setFormError("Vui lòng điền tiêu đề và đường dẫn video.");
      return;
    }

    if (editingVideo) {
      const res = contentService.updateVideo(currentUser, editingVideo.id, {
        title: title.trim(),
        description: description.trim(),
        topicId,
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        presenter: presenter.trim(),
        duration: duration.trim(),
        status: targetStatus,
      });

      if (res.success) {
        refreshList();
        setShowAddModal(false);
        setActionSuccess(`Đã cập nhật video "${res.video?.title}"!`);
        setTimeout(() => setActionSuccess(""), 3500);
      } else {
        setFormError(res.error || "Không thể cập nhật video.");
      }
    } else {
      const res = contentService.createVideo(currentUser, {
        title: title.trim(),
        description: description.trim(),
        topicId,
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        presenter: presenter.trim(),
        duration: duration.trim(),
        status: targetStatus,
      });

      if (res.success) {
        refreshList();
        setShowAddModal(false);
        setActionSuccess(`Đã thêm thành công video "${res.video?.title}" (${targetStatus === "published" ? "Đã xuất bản" : "Bản nháp/Chờ duyệt"})!`);
        setTimeout(() => setActionSuccess(""), 3500);
      } else {
        setFormError(res.error || "Không thể thêm video.");
      }
    }
  };

  const handleDelete = (v: MediaVideoItem) => {
    if (!window.confirm(`Bạn có chắc muốn xóa video "${v.title}"?`)) return;

    const res = contentService.deleteVideo(currentUser, v.id);
    if (res.success) {
      refreshList();
      setActionSuccess(`Đã xóa video "${v.title}"!`);
      setTimeout(() => setActionSuccess(""), 3000);
    } else {
      alert(res.error || "Không thể xóa video.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-rose-600" />
            <span>Quản Lý Video Tuyên Truyền & Phóng Sự Số</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhúng video YouTube, liên kết video học đường, quản trị danh mục chủ đề và quản lý trạng thái xuất bản
          </p>
        </div>

        {canManageVideos && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Video Mới</span>
          </button>
        )}
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề video, diễn giả, mô tả..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value={0}>Tất cả chủ đề</option>
              {OFFICIAL_TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  Chủ đề {t.id}: {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Bản nháp</option>
              <option value="pending_approval">Chờ duyệt</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Hiển thị <strong>{filteredVideos.length}</strong> / {videos.length} video tuyên truyền
          </span>
          <span className="text-slate-400">
            Hỗ trợ nhúng YouTube không phát sinh chi phí lưu trữ Firebase Storage
          </span>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVideos.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            Chưa có video nào trong danh mục lọc.
          </div>
        ) : (
          filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              {/* Thumbnail with Play Icon */}
              <div
                onClick={() => setPreviewVideo(video)}
                className="relative h-44 bg-slate-900 group cursor-pointer overflow-hidden"
              >
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                />
                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center group-hover:bg-slate-950/20 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>

                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-slate-950/80 text-white text-[10px] font-bold backdrop-blur-xs">
                  {video.topicTitle}
                </span>

                <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-slate-950/80 text-white text-[11px] font-mono font-bold">
                  {video.duration || "05:00"}
                </span>

                <span
                  className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    video.status === "published"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : video.status === "pending_approval"
                      ? "bg-sky-500 text-white shadow-xs"
                      : "bg-amber-500 text-white shadow-xs"
                  }`}
                >
                  {video.status === "published"
                    ? "Đã xuất bản"
                    : video.status === "pending_approval"
                    ? "Chờ duyệt"
                    : "Bản nháp"}
                </span>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h3
                    onClick={() => setPreviewVideo(video)}
                    className="text-sm font-bold text-slate-900 line-clamp-2 hover:text-rose-600 cursor-pointer leading-snug"
                  >
                    {video.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {video.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium truncate max-w-[180px]">
                      {video.presenter}
                    </span>
                    <span className="font-mono">{new Date(video.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => setPreviewVideo(video)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Xem thử</span>
                    </button>

                    {canManageVideos && (
                      <>
                        <button
                          onClick={() => openEdit(video)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={() => handleDelete(video)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ==================== MODAL: ADD / EDIT VIDEO ==================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-5 h-5 text-rose-600" />
                <span>{editingVideo ? "Chỉnh Sửa Video Tuyên Truyền" : "Thêm Mới Video Tuyên Truyền"}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
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

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tiêu đề video (*):</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Phóng sự: Ước mơ bình đẳng của học sinh THCS Quảng Châu..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Chủ đề (*):</label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {OFFICIAL_TOPICS.map((t) => (
                      <option key={t.id} value={t.id}>
                        Chủ đề {t.id}: {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Thời lượng (phút:giây):</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="06:30"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Youtube className="w-4 h-4 text-rose-600" />
                  <span>Đường dẫn video YouTube hoặc trực tiếp (*):</span>
                </label>
                <input
                  type="text"
                  required
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    if (!thumbnailUrl && e.target.value) {
                      setThumbnailUrl(contentService.getYouTubeThumbnail(e.target.value));
                    }
                  }}
                  placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                />
                <p className="text-[11px] text-slate-400">
                  Hệ thống hỗ trợ parse tự động ID video YouTube, tự động lấy ảnh bìa HD và nhúng an toàn.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Ảnh đại diện (Thumbnail URL):</label>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="Để trống để tự động lấy từ YouTube..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Đơn vị / Người thực hiện:</label>
                <input
                  type="text"
                  value={presenter}
                  onChange={(e) => setPresenter(e.target.value)}
                  placeholder="Ví dụ: Chi đội 8C1 & Tổ KHTN"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mô tả tóm tắt nội dung video:</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả tóm tắt nội dung giáo dục, thông điệp truyền tải của video..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Hủy
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave("draft")}
                    className="px-4 py-2 rounded-xl text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold shadow-xs cursor-pointer"
                  >
                    Lưu Bản Nháp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(isSuperAdmin ? "published" : "pending_approval")}
                    className="px-5 py-2 rounded-xl text-white bg-rose-600 hover:bg-rose-700 font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSuperAdmin ? "Xuất Bản Ngay" : "Gửi Duyệt Video"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: PREVIEW VIDEO PLAYER ==================== */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-5 text-white shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-teal-400 uppercase">
                  {previewVideo.topicTitle}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {previewVideo.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Embed */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800">
              {contentService.extractYouTubeId(previewVideo.videoUrl) ? (
                <iframe
                  src={contentService.getYouTubeEmbedUrl(previewVideo.videoUrl)}
                  title={previewVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <video
                  src={previewVideo.videoUrl}
                  controls
                  className="w-full h-full object-contain"
                >
                  Trình duyệt không hỗ trợ xem video trực tiếp.
                </video>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-300 leading-relaxed">{previewVideo.description}</p>
              <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-800">
                <span>Thực hiện: <strong className="text-slate-300">{previewVideo.presenter}</strong></span>
                <span>Thời lượng: {previewVideo.duration || "05:00"}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewVideo(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Đóng trình chiếu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
