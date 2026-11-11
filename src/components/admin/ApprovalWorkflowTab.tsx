import { useState, useEffect } from "react";
import { contentService } from "../../services/contentService";
import { adminService } from "../../services/adminService";
import { UserAccount, ContentStatus } from "../../types/adminTypes";
import {
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Video,
  Image as ImageIcon,
  RotateCcw,
  Send,
  Eye,
  X,
  Clock,
  ShieldCheck,
  User,
} from "lucide-react";

interface ApprovalWorkflowTabProps {
  currentUser: UserAccount;
}

export default function ApprovalWorkflowTab({ currentUser }: ApprovalWorkflowTabProps) {
  const isSuperAdmin = currentUser.role === "super_admin";
  const [data, setData] = useState(() => contentService.getPendingApprovals(currentUser));
  const [actionSuccess, setActionSuccess] = useState("");
  const [rejectModalItem, setRejectModalItem] = useState<{
    type: "question" | "post" | "video" | "image";
    id: string;
    title: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const refreshPending = () => {
    setData(contentService.getPendingApprovals(currentUser));
  };

  useEffect(() => {
    refreshPending();
  }, [currentUser]);

  // Approve & Publish action
  const handleApprove = (type: "question" | "post" | "video" | "image", id: string, name: string) => {
    if (!isSuperAdmin) {
      alert("Chỉ Admin chính của nhà trường mới có quyền Duyệt và Xuất bản công khai nội dung!");
      return;
    }

    const res = contentService.changeContentStatus(currentUser, type, id, "published");
    if (res.success) {
      refreshPending();
      setActionSuccess(`Đã duyệt và xuất bản công khai "${name}" lên website nhà trường!`);
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      alert(res.error || "Không thể duyệt nội dung.");
    }
  };

  // Reject / Return to draft action
  const handleConfirmReject = () => {
    if (!rejectModalItem) return;

    const res = contentService.changeContentStatus(
      currentUser,
      rejectModalItem.type,
      rejectModalItem.id,
      "draft",
      rejectReason.trim() || "Cần rà soát và bổ sung thêm thông tin"
    );

    if (res.success) {
      refreshPending();
      setRejectModalItem(null);
      setRejectReason("");
      setActionSuccess(`Đã trả nội dung "${rejectModalItem.title}" về trạng thái Bản nháp để tác giả chỉnh sửa!`);
      setTimeout(() => setActionSuccess(""), 3500);
    } else {
      alert(res.error || "Không thể thực hiện.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <CheckCheck className="w-5 h-5 text-emerald-600" />
          <span>Trung Tâm Phê Duyệt & Xuất Bản Nội Dung</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Quy trình kiểm soát chất lượng sư phạm: Soạn thảo → Gửi duyệt → Admin chính thẩm định → Xuất bản công khai
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Summary KPI Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              {isSuperAdmin ? "Quyền Duyệt Cuối Cùng Của Admin Chính" : "Giám Sát Nội Dung Đang Chờ Duyệt"}
            </span>
            <h3 className="text-xl font-extrabold text-white">
              Tổng số {data.total} mục đang chờ phê duyệt
            </h3>
            <p className="text-xs text-slate-300">
              Chỉ các nội dung được phê duyệt chuyển sang trạng thái <strong>"Đã xuất bản"</strong> mới hiển thị ra giao diện cho học sinh.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshPending}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm mới danh sách</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Items List by Categories */}
      {data.total === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">
            Hiện không có nội dung nào đang chờ duyệt!
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tất cả các câu hỏi trắc nghiệm, bài viết tuyên truyền, video và hình ảnh được đề xuất đều đã được thẩm định và xử lý.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Pending Questions */}
          {data.questions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Câu hỏi trắc nghiệm chờ duyệt ({data.questions.length})</span>
              </h3>
              <div className="space-y-3">
                {data.questions.map((q) => (
                  <div key={q.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {q.code} · {q.topicTitle}
                      </span>
                      <span className="text-slate-400">Tác giả đề xuất: <strong>{q.createdBy}</strong></span>
                    </div>
                    <p className="font-bold text-slate-800">{q.question}</p>
                    <p className="text-slate-600 text-[11px]">Đáp án đúng: <strong>{q.correctOptionId}</strong> · {q.explanation}</p>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => setRejectModalItem({ type: "question", id: q.id, title: q.question })}
                        className="px-3 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold transition-colors cursor-pointer"
                      >
                        Yêu cầu sửa
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleApprove("question", q.id, q.code)}
                          className="px-3.5 py-1 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Duyệt & Xuất bản
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Pending Posts */}
          {data.posts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Bài viết tuyên truyền chờ duyệt ({data.posts.length})</span>
              </h3>
              <div className="space-y-3">
                {data.posts.map((p) => (
                  <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-800">{p.topicTitle}</span>
                      <span className="text-slate-400">Tác giả: <strong>{p.author}</strong></span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{p.title}</h4>
                    <p className="text-slate-600 line-clamp-2">{p.summary}</p>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => setRejectModalItem({ type: "post", id: p.id, title: p.title })}
                        className="px-3 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold transition-colors cursor-pointer"
                      >
                        Yêu cầu sửa
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleApprove("post", p.id, p.title)}
                          className="px-3.5 py-1 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Duyệt & Xuất bản
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Pending Videos */}
          {data.videos.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Video className="w-4 h-4 text-rose-600" />
                <span>Video tuyên truyền chờ duyệt ({data.videos.length})</span>
              </h3>
              <div className="space-y-3">
                {data.videos.map((v) => (
                  <div key={v.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-800">{v.topicTitle}</span>
                      <span className="text-slate-400">Thực hiện: <strong>{v.presenter}</strong></span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{v.title}</h4>
                    <p className="text-slate-600 line-clamp-2">{v.description}</p>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => setRejectModalItem({ type: "video", id: v.id, title: v.title })}
                        className="px-3 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold transition-colors cursor-pointer"
                      >
                        Yêu cầu sửa
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleApprove("video", v.id, v.title)}
                          className="px-3.5 py-1 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Duyệt & Xuất bản
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Pending Images */}
          {data.images.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>Hình ảnh tư liệu chờ duyệt ({data.images.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {data.images.map((img) => (
                  <div key={img.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="h-32 rounded-lg overflow-hidden bg-slate-200">
                      <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 line-clamp-1">{img.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">Nguồn: {img.sourceCredit}</p>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-200">
                      <button
                        onClick={() => setRejectModalItem({ type: "image", id: img.id, title: img.title })}
                        className="px-2.5 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold text-[11px]"
                      >
                        Yêu cầu sửa
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleApprove("image", img.id, img.title)}
                          className="px-3 py-1 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 font-bold text-[11px]"
                        >
                          Duyệt
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Yêu Cầu Chỉnh Sửa Nội Dung</h3>
              <button
                onClick={() => setRejectModalItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Nội dung <strong>"{rejectModalItem.title}"</strong> sẽ được chuyển về trạng thái <strong>Bản nháp</strong>.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700">Lý do / Hướng dẫn chỉnh sửa gửi cho tác giả:</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Cần bổ sung nguồn trích dẫn của bức ảnh..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-white bg-rose-600 hover:bg-rose-700 font-bold cursor-pointer"
              >
                Xác Nhận Trả Về Nháp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
