import { useState } from "react";
import { contentService } from "../../services/contentService";
import { adminService } from "../../services/adminService";
import { GalleryImageItem, ImageAlbum, UserAccount, ContentStatus } from "../../types/adminTypes";
import { OFFICIAL_TOPICS } from "../../data/officialData";
import {
  Image as ImageIcon,
  FolderPlus,
  Plus,
  Search,
  Filter,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Link,
  User,
  Layers,
  ZoomIn,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface ImagesTabProps {
  currentUser: UserAccount;
}

export default function ImagesTab({ currentUser }: ImagesTabProps) {
  const [images, setImages] = useState<GalleryImageItem[]>(() =>
    contentService.getImages(currentUser)
  );
  const [albums, setAlbums] = useState<ImageAlbum[]>(() => contentService.getAlbums());

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [albumFilter, setAlbumFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<GalleryImageItem | null>(null);

  // Upload Form States
  const [selectedAlbumId, setSelectedAlbumId] = useState(albums[0]?.id || "");
  const [imageTitle, setImageTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [sourceCredit, setSourceCredit] = useState(currentUser.fullName);
  const [topicId, setTopicId] = useState<number>(1);
  const [imageInputMethod, setImageInputMethod] = useState<"file" | "url">("file");
  const [imageUrl, setImageUrl] = useState("");
  const [fileBase64, setFileBase64] = useState("");
  const [detectedFormat, setDetectedFormat] = useState<"jpg" | "png" | "webp">("jpg");
  const [fileSizeKb, setFileSizeKb] = useState<number>(150);
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // New Album Form States
  const [albumName, setAlbumName] = useState("");
  const [albumDesc, setAlbumDesc] = useState("");
  const [albumTopicId, setAlbumTopicId] = useState<number>(1);

  const canManageImages = adminService.hasPermission(currentUser, "manage_images");
  const isSuperAdmin = currentUser.role === "super_admin";

  const refreshList = () => {
    setImages(contentService.getImages(currentUser));
    setAlbums(contentService.getAlbums());
  };

  const filteredImages = images.filter((img) => {
    const matchesSearch =
      img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.sourceCredit.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAlbum = albumFilter === "all" || img.albumId === albumFilter;
    const matchesTopic = topicFilter === 0 || img.topicId === topicFilter;
    const matchesStatus = statusFilter === "all" || img.status === statusFilter;
    return matchesSearch && matchesAlbum && matchesTopic && matchesStatus;
  });

  // Handle local image file with security check & Canvas optimization
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormError("");
    const validation = contentService.validateFileUpload(file, ["image"]);
    if (!validation.valid) {
      setFormError(validation.error || "Tệp không hợp lệ.");
      return;
    }

    const fmt = file.type.includes("png")
      ? "png"
      : file.type.includes("webp")
      ? "webp"
      : "jpg";
    setDetectedFormat(fmt);
    setFileSizeKb(Math.round(file.size / 1024));

    // Optimize and compress via HTML5 canvas if resolution is high
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1400;
        const maxHeight = 1050;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          setFileBase64(dataUrl);
        } else {
          setFileBase64(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Upload image submit
  const handleSaveImage = (targetStatus: ContentStatus) => {
    setFormError("");
    const finalImageUrl = imageInputMethod === "file" ? fileBase64 : imageUrl.trim();

    if (!imageTitle.trim() || !finalImageUrl) {
      setFormError("Vui lòng nhập tiêu đề ảnh và chọn tệp ảnh hoặc liên kết ảnh hợp lệ.");
      return;
    }

    const res = contentService.createImage(currentUser, {
      albumId: selectedAlbumId || albums[0]?.id || "album-1",
      title: imageTitle.trim(),
      caption: caption.trim(),
      sourceCredit: sourceCredit.trim() || currentUser.fullName,
      topicId,
      imageUrl: finalImageUrl,
      format: detectedFormat,
      fileSizeKb,
      status: targetStatus,
    });

    if (res.success) {
      refreshList();
      setShowUploadModal(false);
      setImageTitle("");
      setCaption("");
      setFileBase64("");
      setImageUrl("");
      setActionSuccess(`Đã lưu thành công ảnh "${res.image?.title}" vào thư viện!`);
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      setFormError(res.error || "Không thể lưu hình ảnh.");
    }
  };

  // Create Album
  const handleCreateAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumName.trim()) return;

    const res = contentService.createAlbum(currentUser, albumName.trim(), albumDesc.trim(), albumTopicId);
    if (res.success) {
      refreshList();
      setShowAlbumModal(false);
      setAlbumName("");
      setAlbumDesc("");
      setSelectedAlbumId(res.album?.id || "");
      setActionSuccess(`Đã tạo album mới: "${res.album?.name}"!`);
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      alert(res.error || "Không thể tạo album.");
    }
  };

  // Delete Image
  const handleDeleteImage = (img: GalleryImageItem) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ảnh "${img.title}"?`)) return;

    const res = contentService.deleteImage(currentUser, img.id);
    if (res.success) {
      refreshList();
      setActionSuccess(`Đã xóa ảnh "${img.title}"!`);
      setTimeout(() => setActionSuccess(""), 3000);
    } else {
      alert(res.error || "Không thể xóa ảnh.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-600" />
            <span>Thư Viện Hình Ảnh & Album Tư Liệu Học Đường</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tải lên tranh vẽ cổ động, hình ảnh hoạt động STEM, phân loại theo album, ghi nguồn bản quyền và kiểm duyệt an toàn
          </p>
        </div>

        {canManageImages && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAlbumModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FolderPlus className="w-4 h-4 text-amber-600" />
              <span>Tạo Album Mới</span>
            </button>
            <button
              onClick={() => {
                setShowUploadModal(true);
                setFormError("");
              }}
              className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tải Ảnh Lên</span>
            </button>
          </div>
        )}
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề ảnh, chú thích, nguồn tác giả..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={albumFilter}
              onChange={(e) => setAlbumFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value="all">Tất cả Album ({albums.length})</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value={0}>Tất cả chủ đề</option>
              {OFFICIAL_TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  Chủ đề {t.id}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Bản nháp</option>
              <option value="pending_approval">Chờ duyệt</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Hiển thị <strong>{filteredImages.length}</strong> / {images.length} hình ảnh tư liệu
          </span>
          <span className="text-slate-400">
            Hỗ trợ tự động nén tối ưu dung lượng ảnh & kiểm tra an toàn tệp tải lên
          </span>
        </div>
      </div>

      {/* Images Masonry / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredImages.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            Chưa có hình ảnh nào trong album lọc.
          </div>
        ) : (
          filteredImages.map((img) => (
            <div
              key={img.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Image Thumbnail */}
              <div
                onClick={() => setLightboxImage(img)}
                className="relative h-48 bg-slate-100 cursor-pointer overflow-hidden"
              >
                <img
                  src={img.imageUrl}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white/80 text-slate-900 opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-md transition-opacity">
                    <ZoomIn className="w-5 h-5" />
                  </div>
                </div>

                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-950/70 text-white text-[10px] font-bold backdrop-blur-xs">
                  {img.albumName}
                </span>

                <span
                  className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    img.status === "published"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : img.status === "pending_approval"
                      ? "bg-sky-500 text-white shadow-xs"
                      : "bg-amber-500 text-white shadow-xs"
                  }`}
                >
                  {img.status === "published"
                    ? "Đã duyệt"
                    : img.status === "pending_approval"
                    ? "Chờ duyệt"
                    : "Nháp"}
                </span>
              </div>

              {/* Caption & Source info */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4
                    onClick={() => setLightboxImage(img)}
                    className="text-xs font-bold text-slate-900 line-clamp-1 hover:text-amber-700 cursor-pointer"
                  >
                    {img.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                    {img.caption || "Chưa có chú thích"}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="truncate max-w-[140px] text-slate-600 font-medium">
                      Nguồn: {img.sourceCredit}
                    </span>
                    <span className="font-mono uppercase">{img.format} · {img.fileSizeKb}KB</span>
                  </div>

                  {canManageImages && (
                    <div className="flex items-center justify-end gap-1 pt-1">
                      <button
                        onClick={() => handleDeleteImage(img)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa hình ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ==================== MODAL: UPLOAD IMAGE ==================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-600" />
                <span>Tải Hình Ảnh Tư Liệu Vào Thư Viện</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
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

            <div className="space-y-4 text-xs">
              {/* Method tabs */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setImageInputMethod("file")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    imageInputMethod === "file"
                      ? "bg-amber-100 text-amber-900"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Tải tệp từ máy tính (JPG/PNG/WebP)
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMethod("url")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                    imageInputMethod === "url"
                      ? "bg-amber-100 text-amber-900"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Nhập đường dẫn trực tuyến
                </button>
              </div>

              {/* File upload or URL input */}
              {imageInputMethod === "file" ? (
                <div className="p-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 text-center space-y-2">
                  {fileBase64 ? (
                    <div className="space-y-2">
                      <img src={fileBase64} alt="Xem trước" className="max-h-48 mx-auto rounded-xl object-contain shadow-xs" />
                      <p className="text-[11px] text-emerald-700 font-bold">
                        ✓ Tệp đã được nén tối ưu ({fileSizeKb} KB, định dạng {detectedFormat.toUpperCase()})
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-amber-600 mx-auto" />
                      <p className="font-bold text-slate-800">Chọn tệp hình ảnh từ thiết bị</p>
                      <p className="text-[11px] text-slate-500">Chấp nhận JPG, PNG, WebP (Tối đa 5MB)</p>
                    </>
                  )}
                  <label className="inline-block mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors cursor-pointer shadow-xs">
                    <span>{fileBase64 ? "Chọn ảnh khác" : "Duyệt tệp..."}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Đường dẫn hình ảnh (URL):</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... hoặc /src/assets/images/..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {imageUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden max-h-36 border border-slate-200">
                      <img src={imageUrl} alt="Xem trước" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tiêu đề hình ảnh (*):</label>
                <input
                  type="text"
                  required
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  placeholder="Ví dụ: Giờ thực hành STEM của các bạn nữ sinh..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              {/* Album & Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Lưu vào Album:</label>
                  <select
                    value={selectedAlbumId}
                    onChange={(e) => setSelectedAlbumId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {albums.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Chủ đề giáo dục:</label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {OFFICIAL_TOPICS.map((t) => (
                      <option key={t.id} value={t.id}>
                        Chủ đề {t.id}: {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Source Credit */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nguồn ảnh / Tác giả bản quyền (*):</label>
                <input
                  type="text"
                  required
                  value={sourceCredit}
                  onChange={(e) => setSourceCredit(e.target.value)}
                  placeholder="Ví dụ: Chi đội 7A1 - THCS Quảng Châu hoặc Ban Truyền Thông"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Caption */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Chú thích chi tiết bức ảnh:</label>
                <textarea
                  rows={2}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Mô tả bối cảnh, câu chuyện hoặc bài học giáo dục bình đẳng giới qua bức ảnh..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Hủy
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveImage("draft")}
                    className="px-4 py-2 rounded-xl text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold shadow-xs cursor-pointer"
                  >
                    Lưu Bản Nháp
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveImage(isSuperAdmin ? "published" : "pending_approval")}
                    className="px-5 py-2 rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold shadow-xs cursor-pointer"
                  >
                    {isSuperAdmin ? "Lưu & Xuất Bản" : "Gửi Duyệt Ảnh"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CREATE ALBUM ==================== */}
      {showAlbumModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-600" />
                <span>Tạo Album Ảnh Mới</span>
              </h3>
              <button
                onClick={() => setShowAlbumModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAlbum} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Tên Album (*):</label>
                <input
                  type="text"
                  required
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  placeholder="Ví dụ: Hội Thi Vẽ Tranh Cổ Động 2026..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Chủ đề liên quan:</label>
                <select
                  value={albumTopicId}
                  onChange={(e) => setAlbumTopicId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {OFFICIAL_TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>
                      Chủ đề {t.id}: {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mô tả album:</label>
                <textarea
                  rows={3}
                  value={albumDesc}
                  onChange={(e) => setAlbumDesc(e.target.value)}
                  placeholder="Mô tả mục đích và nội dung các hình ảnh trong album..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAlbumModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-bold shadow-xs cursor-pointer"
                >
                  Tạo Album
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== LIGHTBOX PREVIEW ==================== */}
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

            <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs space-y-1.5">
              <p className="text-slate-300 leading-relaxed">{lightboxImage.caption}</p>
              <div className="flex items-center justify-between text-slate-500 pt-1">
                <span>Nguồn / Bản quyền: <strong className="text-slate-300">{lightboxImage.sourceCredit}</strong></span>
                <span>Ngày đăng: {new Date(lightboxImage.createdAt).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
