import { useState } from "react";
import { contentService } from "../../services/contentService";
import { adminService } from "../../services/adminService";
import { ArticlePost, UserAccount, ContentStatus } from "../../types/adminTypes";
import { OFFICIAL_TOPICS } from "../../data/officialData";
import { siteImages } from "../../assets/siteImages";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link,
  Image as ImageIcon,
  Palette,
  Calendar,
  User,
  Share2,
} from "lucide-react";

interface PostsTabProps {
  currentUser: UserAccount;
}

export default function PostsTab({ currentUser }: PostsTabProps) {
  const [posts, setPosts] = useState<ArticlePost[]>(() => contentService.getPosts(currentUser));

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals & Editing
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingPost, setEditingPost] = useState<ArticlePost | null>(null);
  const [previewPost, setPreviewPost] = useState<ArticlePost | null>(null);
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");

  // Form States
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState(siteImages.hero);
  const [topicId, setTopicId] = useState<number>(1);
  const [author, setAuthor] = useState(currentUser.fullName);
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const canManagePosts = adminService.hasPermission(currentUser, "manage_posts");
  const isSuperAdmin = currentUser.role === "super_admin";

  const refreshList = () => {
    setPosts(contentService.getPosts(currentUser));
  };

  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = topicFilter === 0 || p.topicId === topicFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesTopic && matchesStatus;
  });

  const resetForm = () => {
    setTitle("");
    setSummary("");
    setContent("");
    setCoverImage(siteImages.hero);
    setTopicId(1);
    setAuthor(currentUser.fullName);
    setFormError("");
    setEditorMode("edit");
  };

  const openCreate = () => {
    resetForm();
    setEditingPost(null);
    setShowEditorModal(true);
  };

  const openEdit = (p: ArticlePost) => {
    setEditingPost(p);
    setTitle(p.title);
    setSummary(p.summary);
    setContent(p.content);
    setCoverImage(p.coverImage);
    setTopicId(p.topicId);
    setAuthor(p.author);
    setFormError("");
    setEditorMode("edit");
    setShowEditorModal(true);
  };

  // Rich Text Editor formatting helper
  const insertFormatting = (tag: string, placeholder = "nội dung...") => {
    const textarea = document.getElementById("post-rich-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end) || placeholder;

    let replacement = "";
    switch (tag) {
      case "h2":
        replacement = `<h2>${selected}</h2>\n`;
        break;
      case "h3":
        replacement = `<h3>${selected}</h3>\n`;
        break;
      case "b":
        replacement = `<strong>${selected}</strong>`;
        break;
      case "i":
        replacement = `<em>${selected}</em>`;
        break;
      case "u":
        replacement = `<u>${selected}</u>`;
        break;
      case "quote":
        replacement = `<blockquote>${selected}</blockquote>\n`;
        break;
      case "ul":
        replacement = `<ul>\n  <li>${selected}</li>\n  <li>Ý tiếp theo...</li>\n</ul>\n`;
        break;
      case "ol":
        replacement = `<ol>\n  <li>${selected}</li>\n  <li>Bước tiếp theo...</li>\n</ol>\n`;
        break;
      case "img":
        const imgUrl = window.prompt("Nhập đường dẫn ảnh:", siteImages.hero);
        if (imgUrl) replacement = `<img src="${imgUrl}" alt="${selected}" class="rounded-xl my-3 max-h-72 object-cover" />\n`;
        break;
      case "link":
        const url = window.prompt("Nhập liên kết website:", "https://");
        if (url) replacement = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-semibold">${selected}</a>`;
        break;
      default:
        replacement = selected;
    }

    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    setContent(before + replacement + after);
  };

  // Save handler (draft or publish/submit review)
  const handleSave = async (targetStatus: ContentStatus) => {
    setFormError("");
    if (!title.trim() || !content.trim()) {
      setFormError("Vui lòng điền tiêu đề và nội dung bài viết.");
      return;
    }

    if (editingPost) {
      let res;
      try {
        res = await contentService.updatePost(currentUser, editingPost.id, {
          title: title.trim(),
          summary: summary.trim() || title.trim(),
          content,
          coverImage,
          topicId,
          author: author.trim() || currentUser.fullName,
          status: targetStatus,
        });
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Không thể cập nhật bài viết.");
        return;
      }

      if (res.success) {
        refreshList();
        setShowEditorModal(false);
        setActionSuccess(`Đã cập nhật bài viết "${res.post?.title}"!`);
        setTimeout(() => setActionSuccess(""), 3500);
      } else {
        setFormError(res.error || "Không thể cập nhật bài viết.");
      }
    } else {
      let res;
      try {
        res = await contentService.createPost(currentUser, {
          title: title.trim(),
          summary: summary.trim() || title.trim(),
          content,
          coverImage,
          topicId,
          author: author.trim() || currentUser.fullName,
          status: targetStatus,
        });
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Không thể tạo bài viết.");
        return;
      }

      if (res.success) {
        refreshList();
        setShowEditorModal(false);
        setActionSuccess(`Đã tạo thành công bài viết "${res.post?.title}" (${targetStatus === "published" ? "Đã xuất bản" : "Bản nháp/Chờ duyệt"})!`);
        setTimeout(() => setActionSuccess(""), 3500);
      } else {
        setFormError(res.error || "Không thể tạo bài viết.");
      }
    }
  };

  // Delete handler
  const handleDelete = async (p: ArticlePost) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bài viết "${p.title}"?`)) return;

    let res;
    try {
      res = await contentService.deletePost(currentUser, p.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể xóa bài viết.");
      return;
    }
    if (res.success) {
      refreshList();
      setActionSuccess(`Đã xóa bài viết "${p.title}"!`);
      setTimeout(() => setActionSuccess(""), 3000);
    } else {
      alert(res.error || "Không thể xóa bài viết.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            <span>Quản Lý Bài Viết Tuyên Truyền Bình Đẳng Giới</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Biên tập bài viết, phóng sự học đường, cẩm nang giới tính với trình soạn thảo trực quan và quy trình xuất bản
          </p>
        </div>

        {canManagePosts && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>Soạn Bài Viết Mới</span>
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
              placeholder="Tìm theo tiêu đề, tóm tắt, tác giả..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none text-slate-700"
            >
              <option value={0}>Tất cả 6 chủ đề</option>
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
            Hiển thị <strong>{filteredPosts.length}</strong> / {posts.length} bài viết
          </span>
          <span className="text-slate-400">
            Quy trình xuất bản: Soạn thảo → Xem trước → Gửi duyệt nếu cần → Xuất bản
          </span>
        </div>
      </div>

      {/* Posts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPosts.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            Chưa có bài viết nào trong danh mục lọc.
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              {/* Cover Image & Topic badge */}
              <div className="relative h-44 bg-slate-100">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-950/70 text-white text-[10px] font-bold backdrop-blur-xs">
                  {post.topicTitle}
                </span>
                <span
                  className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    post.status === "published"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : post.status === "pending_approval"
                      ? "bg-sky-500 text-white shadow-xs"
                      : "bg-amber-500 text-white shadow-xs"
                  }`}
                >
                  {post.status === "published"
                    ? "Đã xuất bản"
                    : post.status === "pending_approval"
                    ? "Chờ duyệt"
                    : "Bản nháp"}
                </span>
              </div>

              {/* Content body */}
              <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2 hover:text-teal-700 leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {post.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{post.author}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{new Date(post.createdAt).toLocaleDateString("vi-VN")}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => setPreviewPost(post)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem</span>
                    </button>

                    {canManagePosts && (
                      <>
                        <button
                          onClick={() => openEdit(post)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={() => handleDelete(post)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa bài viết"
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

      {/* ==================== MODAL: RICH CONTENT EDITOR ==================== */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <span>{editingPost ? "Chỉnh Sửa Bài Viết Tuyên Truyền" : "Soạn Thảo Bài Viết Mới"}</span>
                </h3>

                {/* Editor / Preview Mode Tabs */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditorMode("edit")}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      editorMode === "edit" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Soạn thảo
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("preview")}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      editorMode === "preview" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Xem trước trực quan
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowEditorModal(false)}
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

            {editorMode === "edit" ? (
              <div className="space-y-4 text-xs">
                {/* Title */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tiêu đề bài viết (*):</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Phá bỏ rào cản định kiến giới trong giờ học STEM..."
                    className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Topic, Author, Cover Image */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Chủ đề (*):</label>
                    <select
                      value={topicId}
                      onChange={(e) => setTopicId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {OFFICIAL_TOPICS.map((t) => (
                        <option key={t.id} value={t.id}>
                          Chủ đề {t.id}: {t.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Tác giả / Chi đội:</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Ví dụ: Cô Nguyễn Thị Mai"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Ảnh đại diện bài viết:</label>
                    <input
                      type="text"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="URL ảnh HTTPS"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tóm tắt ngắn bài viết (1-2 câu):</label>
                  <textarea
                    rows={2}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Mô tả tóm tắt nội dung chính để hiển thị ngoài danh sách bài viết..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
                  />
                </div>

                {/* RICH TEXT FORMATTING TOOLBAR */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-1 p-2 rounded-xl bg-slate-100 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => insertFormatting("h2")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-200 text-xs font-bold text-slate-800"
                      title="Tiêu đề H2"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("h3")}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-200 text-xs font-bold text-slate-800"
                      title="Tiêu đề H3"
                    >
                      H3
                    </button>
                    <div className="w-px h-5 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertFormatting("b")}
                      className="p-1.5 rounded bg-white hover:bg-slate-200 text-slate-800"
                      title="In đậm (Bold)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("i")}
                      className="p-1.5 rounded bg-white hover:bg-slate-200 text-slate-800"
                      title="In nghiêng (Italic)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("u")}
                      className="p-1.5 rounded bg-white hover:bg-slate-200 text-slate-800"
                      title="Gạch chân (Underline)"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-5 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertFormatting("ul")}
                      className="p-1.5 rounded bg-white hover:bg-slate-200 text-slate-800"
                      title="Danh sách gạch đầu dòng"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("ol")}
                      className="p-1.5 rounded bg-white hover:bg-slate-200 text-slate-800"
                      title="Danh sách số thứ tự"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("quote")}
                      className="p-1.5 rounded bg-white hover:bg-slate-200 text-slate-800"
                      title="Trích dẫn tâm đắc (Blockquote)"
                    >
                      <Quote className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-5 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertFormatting("img")}
                      className="p-1.5 rounded bg-white hover:bg-slate-200 text-slate-800"
                      title="Chèn hình ảnh minh họa"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting("link")}
                      className="p-1.5 rounded bg-white hover:bg-slate-200 text-slate-800"
                      title="Chèn liên kết (Hyperlink)"
                    >
                      <Link className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <label className="font-bold text-slate-700">Nội dung chi tiết bài viết (HTML / Soạn thảo trực quan) (*):</label>
                  <textarea
                    id="post-rich-textarea"
                    rows={12}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Nhập nội dung bài viết tuyên truyền. Sử dụng các nút định dạng ở trên để tạo tiêu đề, danh sách, in đậm, chèn ảnh..."
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
                  />
                </div>
              </div>
            ) : (
              /* LIVE PREVIEW OF THE ARTICLE */
              <div className="space-y-6 max-h-[60vh] overflow-y-auto p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="relative h-64 rounded-2xl overflow-hidden shadow-sm">
                  <img src={coverImage} alt={title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                    <div className="space-y-1 text-white">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                        {OFFICIAL_TOPICS.find((t) => t.id === topicId)?.title}
                      </span>
                      <h1 className="text-xl sm:text-2xl font-extrabold">{title || "Tiêu đề bài viết"}</h1>
                      <p className="text-xs text-slate-300">Tác giả: {author} · THCS Quảng Châu</p>
                    </div>
                  </div>
                </div>

                {summary && (
                  <div className="p-4 rounded-xl bg-teal-50 border-l-4 border-teal-500 text-xs sm:text-sm text-teal-950 font-medium italic">
                    {summary}
                  </div>
                )}

                <div
                  className="prose prose-sm max-w-none text-slate-800 space-y-3 leading-relaxed text-xs sm:text-sm"
                  dangerouslySetInnerHTML={{ __html: content || "<p>Chưa có nội dung...</p>" }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer text-xs"
              >
                Hủy
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSave("draft")}
                  className="px-4 py-2 rounded-xl text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold shadow-xs cursor-pointer text-xs"
                >
                  Lưu Bản Nháp
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(isSuperAdmin ? "published" : "pending_approval")}
                  className="px-5 py-2 rounded-xl text-white bg-teal-600 hover:bg-teal-700 font-bold shadow-xs cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSuperAdmin ? "Xuất Bản Ngay" : "Gửi Duyệt Bài Viết"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: PUBLIC PREVIEW ARTICLE ==================== */}
      {previewPost && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-teal-600 uppercase">
                Bản xem bài viết · {previewPost.topicTitle}
              </span>
              <button
                onClick={() => setPreviewPost(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative h-64 rounded-2xl overflow-hidden shadow-sm">
                <img
                  src={previewPost.coverImage}
                  alt={previewPost.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                  {previewPost.title}
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span>Tác giả: <strong className="text-slate-700">{previewPost.author}</strong></span>
                  <span>Ngày đăng: {new Date(previewPost.createdAt).toLocaleDateString("vi-VN")}</span>
                  <span>Lượt đọc: {previewPost.views}</span>
                </div>
              </div>

              {previewPost.summary && (
                <div className="p-4 rounded-xl bg-slate-50 border-l-4 border-teal-500 text-xs sm:text-sm text-slate-700 font-medium italic">
                  {previewPost.summary}
                </div>
              )}

              <div
                className="prose prose-sm max-w-none text-slate-800 space-y-3 leading-relaxed text-xs sm:text-sm pt-2 border-t border-slate-100"
                dangerouslySetInnerHTML={{ __html: previewPost.content }}
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setPreviewPost(null)}
                className="px-5 py-2 rounded-xl text-white bg-slate-900 hover:bg-slate-800 font-bold text-xs"
              >
                Đóng xem bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
