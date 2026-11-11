import {
  ManageableQuestion,
  ArticlePost,
  MediaVideoItem,
  ImageAlbum,
  GalleryImageItem,
  ContentStatus,
  UserAccount,
  AdminPermission,
} from "../types/adminTypes";
import { OFFICIAL_QUESTIONS, OFFICIAL_TOPICS } from "../data/officialData";
import { adminService } from "./adminService";
import * as XLSX from "xlsx";

const STORAGE_KEY_QUESTIONS = "thcs_quang_chau_content_questions";
const STORAGE_KEY_POSTS = "thcs_quang_chau_content_posts";
const STORAGE_KEY_VIDEOS = "thcs_quang_chau_content_videos";
const STORAGE_KEY_ALBUMS = "thcs_quang_chau_content_albums";
const STORAGE_KEY_IMAGES = "thcs_quang_chau_content_images";

// 30 default official questions from data/officialData.ts
const INITIAL_QUESTIONS: ManageableQuestion[] = OFFICIAL_QUESTIONS.map((q) => {
  const topic = OFFICIAL_TOPICS.find((t) => t.id === q.topicId);
  return {
    id: q.id,
    code: q.id,
    topicId: q.topicId,
    topicTitle: topic ? topic.title : `Chủ đề ${q.topicId}`,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
    correctOptionId: q.correctOptionId,
    explanation: q.explanation,
    status: "published" as ContentStatus,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    createdBy: "Hội Đồng Khoa Học THCS Quảng Châu",
    isDefault: true,
  };
});

// Initial curated educational articles
const INITIAL_POSTS: ArticlePost[] = [
  {
    id: "post-1",
    title: "Bình Đẳng Giới – Không Giới Hạn Ước Mơ: Hành Trình Tỏa Sáng Của Học Sinh THCS Quảng Châu",
    summary: "Nhìn lại hành trình lan tỏa nhận thức bình đẳng giới, phá bỏ định kiến và mở rộng cơ hội học tập, nghiên cứu sáng tạo tại Trường THCS Quảng Châu.",
    coverImage: "/src/assets/images/hero_gender_equality_1794298223798.jpg",
    topicId: 1,
    topicTitle: "Hiểu đúng về bình đẳng giới",
    author: "Thầy Lê Văn Hùng & Đội Tuyên Truyền Măng Non",
    status: "published",
    createdAt: "2026-11-02T08:30:00.000Z",
    updatedAt: "2026-11-02T08:30:00.000Z",
    createdBy: "Ban Giám Hiệu",
    views: 342,
    content: `
      <h2>1. Tôn trọng sự khác biệt, bình đẳng cơ hội</h2>
      <p>Tại Trường THCS Quảng Châu, chúng tôi tin rằng bình đẳng giới không phải là cào bằng hay ép buộc mọi người phải giống nhau. Bình đẳng giới chính là tạo ra môi trường công bằng, an toàn để mỗi bạn học sinh dù là nam hay nữ đều được tự do phát huy năng lực, theo đuổi đam mê cá nhân mà không phải chịu bất kỳ sự phán xét nào.</p>
      <p>Trong các lớp học từ khối 6 đến khối 9, các thầy cô giáo luôn chú trọng phương pháp giáo dục tích cực, khuyến khích các em cùng chia sẻ việc chung, luân phiên nhận các nhiệm vụ cán sự lớp, trực nhật và thuyết trình nhóm.</p>
      <h2>2. Hành động nhỏ – Thay đổi lớn</h2>
      <p>Mỗi học sinh Quảng Châu đều là một đại sứ truyền thông tích cực. Từ việc không trêu chọc bạn bè về giới tính, đến việc sẵn sàng chia sẻ việc nhà với gia đình mỗi buổi chiều, những việc làm giản dị đó đang góp phần tạo nên một môi trường học đường văn minh, hạnh phúc.</p>
    `,
  },
  {
    id: "post-2",
    title: "Nữ Sinh Với Giấc Mơ STEM & Công Nghệ Số: Phá Vỡ Mọi Rào Cản Định Kiến",
    summary: "Câu chuyện truyền cảm hứng từ câu lạc bộ khoa học kỹ thuật trường THCS Quảng Châu, nơi các bạn nữ sinh tự tin lắp ráp robot và lập trình sáng tạo.",
    coverImage: "/src/assets/images/stem_and_dreams_1794298224995.jpg",
    topicId: 2,
    topicTitle: "Bình đẳng giới trong học tập",
    author: "Cô Nguyễn Thị Mai & Nhóm Nữ Sinh STEM 8C1",
    status: "published",
    createdAt: "2026-11-04T14:15:00.000Z",
    updatedAt: "2026-11-04T14:15:00.000Z",
    createdBy: "Cô Nguyễn Thị Mai",
    views: 289,
    content: `
      <h2>STEM không có ranh giới giới tính</h2>
      <p>Trước đây, nhiều người thường có định kiến rằng các môn khoa học kỹ thuật, lập trình hay lắp ráp máy móc chỉ phù hợp với các bạn nam. Tuy nhiên, tại câu lạc bộ STEM Trường THCS Quảng Châu, các bạn nữ sinh khối 8 và 9 đã chứng minh điều hoàn toàn ngược lại.</p>
      <p>Với sự kiên trì, tỉ mỉ và tư duy logic nhạy bén, các bạn đã cùng nhóm bạn nam thiết kế mô hình tưới cây thông minh và hệ thống phân loại rác tự động, đạt giải cao trong hội thi cấp huyện.</p>
      <blockquote>"Khi em cầm mỏ hàn và viết dòng code đầu tiên, em hiểu rằng đam mê không bao giờ có giới tính!" – chia sẻ của em Hoàng Diệu Linh (Lớp 8C1).</blockquote>
    `,
  },
  {
    id: "post-3",
    title: "Gia Đình Hạnh Phúc: Khi Việc Nhà Là Niềm Vui Sẻ Chia",
    summary: "Hướng dẫn các bạn học sinh cách xây dựng thời gian biểu chia sẻ công việc nhà hợp lý, thể hiện lòng hiếu thảo và tình yêu thương đối với cha mẹ.",
    coverImage: "/src/assets/images/youth_action_campaign_1794298224215.jpg",
    topicId: 3,
    topicTitle: "Bình đẳng giới trong gia đình",
    author: "Thầy Phan Đình Trí (Tổ KHTN & Kỹ năng sống)",
    status: "published",
    createdAt: "2026-11-06T09:00:00.000Z",
    updatedAt: "2026-11-06T09:00:00.000Z",
    createdBy: "Thầy Phan Đình Trí",
    views: 215,
    content: `
      <h2>Việc nhà là trách nhiệm chung của các thành viên</h2>
      <p>Theo Luật Bình đẳng giới (Điều 18), vợ chồng, con cái đều có trách nhiệm cùng nhau chia sẻ công việc gia đình. Nấu ăn, quét nhà, rửa bát hay giặt giũ quần áo không phải là công việc mặc định riêng của mẹ hay con gái.</p>
      <p>Nấu ăn là kỹ năng sống thiết yếu cho mọi người để tự lập và chăm sóc những người thân yêu. Hãy cùng gia đình lập bảng phân công việc nhà theo tuần để cả nhà cùng vui vẻ, gắn kết!</p>
    `,
  },
];

// Initial curated educational videos
const INITIAL_VIDEOS: MediaVideoItem[] = [
  {
    id: "video-1",
    title: "Phim Ngắn: Bay Cao Ước Mơ Học Đường",
    description: "Bộ phim ngắn do học sinh Khối 8 và Khối 9 Trường THCS Quảng Châu tự biên kịch và đóng vai, phản ánh câu chuyện vượt qua định kiến nghề nghiệp để tự tin theo đuổi đam mê.",
    topicId: 4,
    topicTitle: "Bình đẳng giới trong lựa chọn nghề nghiệp",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    youtubeId: "dQw4w9WgXcQ",
    thumbnailUrl: "/src/assets/images/hero_gender_equality_1794298223798.jpg",
    presenter: "Chi đội 8C1 & Câu lạc bộ Truyền thông Măng Non",
    duration: "06:45",
    status: "published",
    createdAt: "2026-11-03T10:00:00.000Z",
    updatedAt: "2026-11-03T10:00:00.000Z",
    createdBy: "Ban Biên Tập",
  },
  {
    id: "video-2",
    title: "Talkshow: Lắng Nghe Tiếng Nói Thanh Thiếu Niên 2026",
    description: "Diễn đàn trao đổi cởi mở giữa các thầy cô giáo, chuyên gia tâm lý học đường và đại diện học sinh các khối lớp về văn hóa ứng xử văn minh trên không gian mạng.",
    topicId: 5,
    topicTitle: "Bình đẳng giới trong môi trường số",
    videoUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    youtubeId: "ScMzIvxBSi4",
    thumbnailUrl: "/src/assets/images/stem_and_dreams_1794298224995.jpg",
    presenter: "Ban Giám Hiệu & Đoàn Đội THCS Quảng Châu",
    duration: "12:30",
    status: "published",
    createdAt: "2026-11-05T15:30:00.000Z",
    updatedAt: "2026-11-05T15:30:00.000Z",
    createdBy: "Ban Giám Hiệu",
  },
];

// Initial curated albums
const INITIAL_ALBUMS: ImageAlbum[] = [
  {
    id: "album-1",
    name: "Chiến Dịch Truyền Thông Học Đường 2026",
    description: "Hình ảnh các hoạt động sinh hoạt dưới cờ, diễn đàn thanh niên kiến tạo bình đẳng giới tại Trường THCS Quảng Châu",
    topicId: 6,
    createdAt: "2026-11-01T00:00:00.000Z",
    createdBy: "Hội Đồng Đội",
  },
  {
    id: "album-2",
    name: "Tranh Cổ Động & Sáng Kiến Học Sinh",
    description: "Các tác phẩm vẽ tranh cổ động, infographic và khẩu hiệu bình đẳng giới do học sinh các khối lớp sáng tác",
    topicId: 1,
    createdAt: "2026-11-02T00:00:00.000Z",
    createdBy: "CLB Mỹ Thuật",
  },
  {
    id: "album-3",
    name: "Không Gian Trải Nghiệm STEM & Hướng Nghiệp",
    description: "Hoạt động sáng tạo khoa học kỹ thuật, lắp ráp robot không phân biệt giới tính của học sinh THCS",
    topicId: 2,
    createdAt: "2026-11-03T00:00:00.000Z",
    createdBy: "Tổ Khoa Học Tự Nhiên",
  },
];

// Initial gallery images
const INITIAL_IMAGES: GalleryImageItem[] = [
  {
    id: "img-1",
    albumId: "album-1",
    albumName: "Chiến Dịch Truyền Thông Học Đường 2026",
    title: "Lễ phát động chiến dịch Bình đẳng giới – Không giới hạn ước mơ",
    caption: "Học sinh toàn trường hào hứng tham gia buổi sinh hoạt truyền thông chuyên đề dưới cờ đầu tuần.",
    sourceCredit: "Ban Truyền Thông THCS Quảng Châu",
    topicId: 6,
    topicTitle: "Hành động vì môi trường bình đẳng",
    imageUrl: "/src/assets/images/youth_action_campaign_1794298224215.jpg",
    format: "jpg",
    fileSizeKb: 340,
    status: "published",
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-01T08:00:00.000Z",
    createdBy: "Ban Truyền Thông",
  },
  {
    id: "img-2",
    albumId: "album-3",
    albumName: "Không Gian Trải Nghiệm STEM & Hướng Nghiệp",
    title: "Học sinh nữ và nam cùng say mê lắp ráp mạch vi điều khiển",
    caption: "Giờ thực hành STEM với sự hợp tác nhịp nhàng, công bằng và tôn trọng khả năng của từng bạn.",
    sourceCredit: "CLB STEM & Sáng Tạo Trẻ",
    topicId: 2,
    topicTitle: "Bình đẳng giới trong học tập",
    imageUrl: "/src/assets/images/stem_and_dreams_1794298224995.jpg",
    format: "jpg",
    fileSizeKb: 412,
    status: "published",
    createdAt: "2026-11-02T10:30:00.000Z",
    updatedAt: "2026-11-02T10:30:00.000Z",
    createdBy: "CLB STEM",
  },
  {
    id: "img-3",
    albumId: "album-2",
    albumName: "Tranh Cổ Động & Sáng Kiến Học Sinh",
    title: "Bức tranh: Cùng nhau chắp cánh ước mơ tương lai",
    caption: "Tác phẩm tranh vẽ thể hiện tình bạn trong sáng, sẻ chia trách nhiệm học tập và xây dựng ước mơ vươn xa.",
    sourceCredit: "Chi đội 7A1 - THCS Quảng Châu",
    topicId: 1,
    topicTitle: "Hiểu đúng về bình đẳng giới",
    imageUrl: "/src/assets/images/hero_gender_equality_1794298223798.jpg",
    format: "jpg",
    fileSizeKb: 395,
    status: "published",
    createdAt: "2026-11-03T14:00:00.000Z",
    updatedAt: "2026-11-03T14:00:00.000Z",
    createdBy: "Chi đội 7A1",
  },
];

class ContentService {
  private memoryStorage: Record<string, string> = {};

  private getStorage<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
        const data = window.localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
      }
      const memData = this.memoryStorage[key];
      return memData ? JSON.parse(memData) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    try {
      if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(value));
      } else {
        this.memoryStorage[key] = JSON.stringify(value);
      }
    } catch (e) {
      console.error("Content Storage write error:", e);
    }
  }

  // ==================== YOUTUBE & SECURITY HELPERS ====================
  extractYouTubeId(url: string): string | null {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  getYouTubeEmbedUrl(url: string): string {
    const id = this.extractYouTubeId(url);
    if (id) {
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  }

  getYouTubeThumbnail(url: string): string {
    const id = this.extractYouTubeId(url);
    if (id) {
      return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    return "/src/assets/images/hero_gender_equality_1794298223798.jpg";
  }

  // Security file validator: Blocks dangerous executables (.exe, .bat, .sh, .cmd, .js, .msi, etc.)
  validateFileUpload(file: File, allowedTypes?: ("image" | "excel" | "json")[]): { valid: boolean; error?: string } {
    const fileName = file.name.toLowerCase();
    const dangerousExtensions = [".exe", ".bat", ".cmd", ".sh", ".msi", ".vbs", ".js", ".scr", ".com", ".pif", ".jar", ".app"];
    for (const ext of dangerousExtensions) {
      if (fileName.endsWith(ext)) {
        return {
          valid: false,
          error: `BẢO MẬT: Tệp "${file.name}" chứa định dạng thực thi nguy hiểm (${ext}). Bị hệ thống từ chối tải lên!`,
        };
      }
    }

    if (allowedTypes && allowedTypes.includes("image")) {
      const validImageFormats = ["image/jpeg", "image/png", "image/webp"];
      if (!validImageFormats.includes(file.type) && !fileName.match(/\.(jpg|jpeg|png|webp)$/i)) {
        return {
          valid: false,
          error: "Định dạng hình ảnh không hợp lệ. Chỉ chấp nhận định dạng JPG, PNG hoặc WebP!",
        };
      }
      if (file.size > 5 * 1024 * 1024) {
        return {
          valid: false,
          error: "Dung lượng ảnh vượt quá giới hạn cho phép (tối đa 5MB). Vui lòng chọn ảnh nhẹ hơn!",
        };
      }
    }

    return { valid: true };
  }

  // ==================== 1. QUESTIONS BANK MANAGEMENT ====================
  getQuestions(actor?: UserAccount | null): ManageableQuestion[] {
    const list = this.getStorage<ManageableQuestion[]>(STORAGE_KEY_QUESTIONS, INITIAL_QUESTIONS);
    if (!actor) {
      // Public view: only published questions
      return list.filter((q) => q.status === "published");
    }
    return list;
  }

  getPublicQuestions(): ManageableQuestion[] {
    return this.getQuestions(null);
  }

  createQuestion(
    actor: UserAccount,
    data: {
      topicId: number;
      difficulty: "Nhận biết" | "Thông hiểu" | "Vận dụng";
      question: string;
      options: { id: "A" | "B" | "C" | "D"; text: string }[];
      correctOptionId: "A" | "B" | "C" | "D";
      explanation: string;
      imageUrl?: string;
      status?: ContentStatus;
    }
  ): { success: boolean; question?: ManageableQuestion; error?: string } {
    this.assertContentPermission(actor, "manage_questions");

    if (!data.question.trim() || data.options.some((o) => !o.text.trim()) || !data.explanation.trim()) {
      return { success: false, error: "Vui lòng nhập đầy đủ nội dung câu hỏi, 4 đáp án và lời giải thích." };
    }

    const currentQuestions = this.getQuestions(actor);
    const topic = OFFICIAL_TOPICS.find((t) => t.id === data.topicId);
    const now = new Date().toISOString();
    const newCode = `Q${String(currentQuestions.length + 1).padStart(2, "0")}`;

    // Teachers or non-super-admins submit for review if requested
    let initialStatus: ContentStatus = data.status || "draft";
    if (actor.role !== "super_admin" && initialStatus === "published") {
      initialStatus = "pending_approval";
    }

    const newQuestion: ManageableQuestion = {
      id: "q-" + Date.now(),
      code: newCode,
      topicId: data.topicId,
      topicTitle: topic ? topic.title : `Chủ đề ${data.topicId}`,
      difficulty: data.difficulty,
      question: data.question.trim(),
      options: data.options.map((o) => ({ id: o.id, text: o.text.trim() })),
      correctOptionId: data.correctOptionId,
      explanation: data.explanation.trim(),
      imageUrl: data.imageUrl?.trim(),
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.fullName,
    };

    this.setStorage(STORAGE_KEY_QUESTIONS, [...currentQuestions, newQuestion]);
    this.logActivity(
      actor,
      "CREATE_QUESTION",
      "question",
      `Tạo câu hỏi trắc nghiệm [${newQuestion.code}] thuộc ${newQuestion.topicTitle} (Trạng thái: ${newQuestion.status})`,
      newQuestion.id
    );

    return { success: true, question: newQuestion };
  }

  updateQuestion(
    actor: UserAccount,
    id: string,
    updates: Partial<ManageableQuestion>
  ): { success: boolean; question?: ManageableQuestion; error?: string } {
    this.assertContentPermission(actor, "manage_questions");

    const questions = this.getQuestions(actor);
    const target = questions.find((q) => q.id === id);
    if (!target) return { success: false, error: "Không tìm thấy câu hỏi." };

    if (updates.topicId !== undefined && updates.topicId !== target.topicId) {
      const topic = OFFICIAL_TOPICS.find((t) => t.id === updates.topicId);
      target.topicId = updates.topicId;
      target.topicTitle = topic ? topic.title : `Chủ đề ${updates.topicId}`;
    }

    if (updates.question !== undefined) target.question = updates.question.trim();
    if (updates.difficulty !== undefined) target.difficulty = updates.difficulty;
    if (updates.options !== undefined) target.options = updates.options;
    if (updates.correctOptionId !== undefined) target.correctOptionId = updates.correctOptionId;
    if (updates.explanation !== undefined) target.explanation = updates.explanation.trim();
    if (updates.imageUrl !== undefined) target.imageUrl = updates.imageUrl.trim();

    if (updates.status !== undefined) {
      if (updates.status === "published" && actor.role !== "super_admin") {
        target.status = "pending_approval";
      } else {
        target.status = updates.status;
      }
    }

    target.updatedAt = new Date().toISOString();
    target.updatedBy = actor.fullName;

    this.setStorage(
      STORAGE_KEY_QUESTIONS,
      questions.map((q) => (q.id === id ? target : q))
    );

    this.logActivity(
      actor,
      "UPDATE_QUESTION",
      "question",
      `Cập nhật câu hỏi [${target.code}]: "${target.question.substring(0, 40)}..."`,
      target.id
    );

    return { success: true, question: target };
  }

  duplicateQuestion(
    actor: UserAccount,
    id: string
  ): { success: boolean; question?: ManageableQuestion; error?: string } {
    this.assertContentPermission(actor, "manage_questions");

    const questions = this.getQuestions(actor);
    const target = questions.find((q) => q.id === id);
    if (!target) return { success: false, error: "Không tìm thấy câu hỏi để nhân bản." };

    const now = new Date().toISOString();
    const newCode = `Q${String(questions.length + 1).padStart(2, "0")}`;

    const cloned: ManageableQuestion = {
      ...target,
      id: "q-" + Date.now(),
      code: newCode,
      question: `(Bản sao) ${target.question}`,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      createdBy: actor.fullName,
      updatedBy: undefined,
      isDefault: false,
    };

    this.setStorage(STORAGE_KEY_QUESTIONS, [...questions, cloned]);
    this.logActivity(
      actor,
      "DUPLICATE_QUESTION",
      "question",
      `Nhân bản câu hỏi từ [${target.code}] thành [${cloned.code}] dạng bản nháp`,
      cloned.id
    );

    return { success: true, question: cloned };
  }

  deleteQuestion(actor: UserAccount, id: string): { success: boolean; error?: string } {
    this.assertContentPermission(actor, "manage_questions");

    const questions = this.getQuestions(actor);
    const target = questions.find((q) => q.id === id);
    if (!target) return { success: false, error: "Không tìm thấy câu hỏi." };

    const updated = questions.filter((q) => q.id !== id);
    this.setStorage(STORAGE_KEY_QUESTIONS, updated);

    this.logActivity(
      actor,
      "DELETE_QUESTION",
      "question",
      `Xóa câu hỏi [${target.code}]: "${target.question.substring(0, 40)}..."`,
      id
    );

    return { success: true };
  }

  exportQuestionsJSON(): string {
    const questions = this.getQuestions(adminService.getCurrentSessionUser());
    return JSON.stringify(questions, null, 2);
  }

  exportQuestionsExcel(): void {
    const questions = this.getQuestions(adminService.getCurrentSessionUser());
    const rows = questions.map((q, idx) => ({
      STT: idx + 1,
      "Mã câu hỏi": q.code,
      "Mã chủ đề": q.topicId,
      "Tên chủ đề": q.topicTitle,
      "Mức độ": q.difficulty,
      "Câu hỏi": q.question,
      "Đáp án A": q.options.find((o) => o.id === "A")?.text || "",
      "Đáp án B": q.options.find((o) => o.id === "B")?.text || "",
      "Đáp án C": q.options.find((o) => o.id === "C")?.text || "",
      "Đáp án D": q.options.find((o) => o.id === "D")?.text || "",
      "Đáp án đúng (A/B/C/D)": q.correctOptionId,
      "Lời giải thích": q.explanation,
      "Trạng thái": q.status === "published" ? "Đã xuất bản" : q.status === "draft" ? "Bản nháp" : "Chờ duyệt",
      "Người tạo": q.createdBy,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "NganHangCauHoi");
    XLSX.writeFile(workbook, "Ngan_hang_cau_hoi_THCS_Quang_Chau.xlsx");
  }

  importQuestionsJSON(actor: UserAccount, jsonStr: string): { success: boolean; count?: number; error?: string } {
    this.assertContentPermission(actor, "manage_questions");
    try {
      const data = JSON.parse(jsonStr);
      if (!Array.isArray(data)) {
        return { success: false, error: "Dữ liệu JSON phải là danh sách câu hỏi hợp lệ!" };
      }

      const validList: ManageableQuestion[] = [];
      const current = this.getQuestions(actor);
      let count = current.length;

      for (const item of data) {
        if (!item.question || !Array.isArray(item.options) || item.options.length < 2 || !item.correctOptionId) {
          continue;
        }
        count++;
        const topic = OFFICIAL_TOPICS.find((t) => t.id === Number(item.topicId)) || OFFICIAL_TOPICS[0];
        validList.push({
          id: "q-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          code: item.code || `Q${String(count).padStart(2, "0")}`,
          topicId: topic.id,
          topicTitle: topic.title,
          difficulty: item.difficulty || "Nhận biết",
          question: item.question.trim(),
          options: item.options.map((o: { id?: string; text?: string }, oIdx: number) => ({
            id: (o.id || String.fromCharCode(65 + oIdx)) as "A" | "B" | "C" | "D",
            text: (o.text || "").trim(),
          })),
          correctOptionId: item.correctOptionId,
          explanation: item.explanation || "Giải thích đang được cập nhật.",
          status: actor.role === "super_admin" ? "published" : "pending_approval",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: actor.fullName,
        });
      }

      if (validList.length === 0) {
        return { success: false, error: "Không tìm thấy câu hỏi hợp lệ nào trong tệp JSON!" };
      }

      this.setStorage(STORAGE_KEY_QUESTIONS, [...current, ...validList]);
      this.logActivity(
        actor,
        "IMPORT_QUESTIONS_JSON",
        "question",
        `Nhập thành công ${validList.length} câu hỏi mới từ tệp JSON`
      );

      return { success: true, count: validList.length };
    } catch {
      return { success: false, error: "Tệp JSON bị lỗi cú pháp!" };
    }
  }

  // ==================== 2. ARTICLES & POSTS MANAGEMENT ====================
  getPosts(actor?: UserAccount | null): ArticlePost[] {
    const list = this.getStorage<ArticlePost[]>(STORAGE_KEY_POSTS, INITIAL_POSTS);
    if (!actor) {
      return list.filter((p) => p.status === "published");
    }
    return list;
  }

  getPublicPosts(): ArticlePost[] {
    return this.getPosts(null);
  }

  createPost(
    actor: UserAccount,
    data: {
      title: string;
      summary: string;
      content: string;
      coverImage: string;
      topicId: number;
      author?: string;
      status?: ContentStatus;
    }
  ): { success: boolean; post?: ArticlePost; error?: string } {
    this.assertContentPermission(actor, "manage_posts");

    if (!data.title.trim() || !data.content.trim()) {
      return { success: false, error: "Vui lòng nhập tiêu đề và nội dung bài viết." };
    }

    const posts = this.getPosts(actor);
    const topic = OFFICIAL_TOPICS.find((t) => t.id === data.topicId) || OFFICIAL_TOPICS[0];
    const now = new Date().toISOString();

    let initialStatus: ContentStatus = data.status || "draft";
    if (actor.role !== "super_admin" && initialStatus === "published") {
      initialStatus = "pending_approval";
    }

    const newPost: ArticlePost = {
      id: "post-" + Date.now(),
      title: data.title.trim(),
      summary: data.summary.trim() || data.title.trim(),
      content: data.content,
      coverImage: data.coverImage.trim() || "/src/assets/images/hero_gender_equality_1794298223798.jpg",
      topicId: topic.id,
      topicTitle: topic.title,
      author: data.author?.trim() || actor.fullName,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.fullName,
      views: 0,
    };

    this.setStorage(STORAGE_KEY_POSTS, [newPost, ...posts]);
    this.logActivity(
      actor,
      "CREATE_POST",
      "post",
      `Soạn bài viết tuyên truyền: "${newPost.title}" (Trạng thái: ${newPost.status})`,
      newPost.id
    );

    return { success: true, post: newPost };
  }

  updatePost(
    actor: UserAccount,
    id: string,
    updates: Partial<ArticlePost>
  ): { success: boolean; post?: ArticlePost; error?: string } {
    this.assertContentPermission(actor, "manage_posts");

    const posts = this.getPosts(actor);
    const target = posts.find((p) => p.id === id);
    if (!target) return { success: false, error: "Không tìm thấy bài viết." };

    if (updates.title !== undefined) target.title = updates.title.trim();
    if (updates.summary !== undefined) target.summary = updates.summary.trim();
    if (updates.content !== undefined) target.content = updates.content;
    if (updates.coverImage !== undefined) target.coverImage = updates.coverImage.trim();
    if (updates.author !== undefined) target.author = updates.author.trim();

    if (updates.topicId !== undefined) {
      const topic = OFFICIAL_TOPICS.find((t) => t.id === updates.topicId);
      target.topicId = updates.topicId;
      target.topicTitle = topic ? topic.title : target.topicTitle;
    }

    if (updates.status !== undefined) {
      if (updates.status === "published" && actor.role !== "super_admin") {
        target.status = "pending_approval";
      } else {
        target.status = updates.status;
      }
    }

    target.updatedAt = new Date().toISOString();
    target.updatedBy = actor.fullName;

    this.setStorage(
      STORAGE_KEY_POSTS,
      posts.map((p) => (p.id === id ? target : p))
    );

    this.logActivity(actor, "UPDATE_POST", "post", `Cập nhật bài viết "${target.title}"`, target.id);
    return { success: true, post: target };
  }

  deletePost(actor: UserAccount, id: string): { success: boolean; error?: string } {
    this.assertContentPermission(actor, "manage_posts");

    const posts = this.getPosts(actor);
    const target = posts.find((p) => p.id === id);
    if (!target) return { success: false, error: "Không tìm thấy bài viết." };

    const updated = posts.filter((p) => p.id !== id);
    this.setStorage(STORAGE_KEY_POSTS, updated);

    this.logActivity(actor, "DELETE_POST", "post", `Xóa bài viết "${target.title}"`, id);
    return { success: true };
  }

  // ==================== 3. VIDEOS MANAGEMENT ====================
  getVideos(actor?: UserAccount | null): MediaVideoItem[] {
    const list = this.getStorage<MediaVideoItem[]>(STORAGE_KEY_VIDEOS, INITIAL_VIDEOS);
    if (!actor) {
      return list.filter((v) => v.status === "published");
    }
    return list;
  }

  getPublicVideos(): MediaVideoItem[] {
    return this.getVideos(null);
  }

  createVideo(
    actor: UserAccount,
    data: {
      title: string;
      description: string;
      topicId: number;
      videoUrl: string;
      thumbnailUrl?: string;
      presenter?: string;
      duration?: string;
      status?: ContentStatus;
    }
  ): { success: boolean; video?: MediaVideoItem; error?: string } {
    this.assertContentPermission(actor, "manage_videos");

    if (!data.title.trim() || !data.videoUrl.trim()) {
      return { success: false, error: "Vui lòng điền tiêu đề và đường dẫn video!" };
    }

    const videos = this.getVideos(actor);
    const topic = OFFICIAL_TOPICS.find((t) => t.id === data.topicId) || OFFICIAL_TOPICS[0];
    const youtubeId = this.extractYouTubeId(data.videoUrl);
    const thumb = data.thumbnailUrl?.trim() || (youtubeId ? this.getYouTubeThumbnail(data.videoUrl) : "/src/assets/images/stem_and_dreams_1794298224995.jpg");

    const now = new Date().toISOString();
    let initialStatus: ContentStatus = data.status || "draft";
    if (actor.role !== "super_admin" && initialStatus === "published") {
      initialStatus = "pending_approval";
    }

    const newVideo: MediaVideoItem = {
      id: "video-" + Date.now(),
      title: data.title.trim(),
      description: data.description.trim(),
      topicId: topic.id,
      topicTitle: topic.title,
      videoUrl: data.videoUrl.trim(),
      youtubeId: youtubeId || undefined,
      thumbnailUrl: thumb,
      presenter: data.presenter?.trim() || "Trường THCS Quảng Châu",
      duration: data.duration?.trim() || "05:00",
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.fullName,
    };

    this.setStorage(STORAGE_KEY_VIDEOS, [newVideo, ...videos]);
    this.logActivity(
      actor,
      "CREATE_VIDEO",
      "video",
      `Đăng tải video tuyên truyền: "${newVideo.title}"`,
      newVideo.id
    );

    return { success: true, video: newVideo };
  }

  updateVideo(
    actor: UserAccount,
    id: string,
    updates: Partial<MediaVideoItem>
  ): { success: boolean; video?: MediaVideoItem; error?: string } {
    this.assertContentPermission(actor, "manage_videos");

    const videos = this.getVideos(actor);
    const target = videos.find((v) => v.id === id);
    if (!target) return { success: false, error: "Không tìm thấy video." };

    if (updates.title !== undefined) target.title = updates.title.trim();
    if (updates.description !== undefined) target.description = updates.description.trim();
    if (updates.videoUrl !== undefined) {
      target.videoUrl = updates.videoUrl.trim();
      const ytId = this.extractYouTubeId(target.videoUrl);
      target.youtubeId = ytId || undefined;
      if (!updates.thumbnailUrl && ytId) {
        target.thumbnailUrl = this.getYouTubeThumbnail(target.videoUrl);
      }
    }
    if (updates.thumbnailUrl !== undefined) target.thumbnailUrl = updates.thumbnailUrl.trim();
    if (updates.presenter !== undefined) target.presenter = updates.presenter.trim();
    if (updates.duration !== undefined) target.duration = updates.duration.trim();

    if (updates.topicId !== undefined) {
      const topic = OFFICIAL_TOPICS.find((t) => t.id === updates.topicId);
      target.topicId = updates.topicId;
      target.topicTitle = topic ? topic.title : target.topicTitle;
    }

    if (updates.status !== undefined) {
      if (updates.status === "published" && actor.role !== "super_admin") {
        target.status = "pending_approval";
      } else {
        target.status = updates.status;
      }
    }

    target.updatedAt = new Date().toISOString();
    target.updatedBy = actor.fullName;

    this.setStorage(
      STORAGE_KEY_VIDEOS,
      videos.map((v) => (v.id === id ? target : v))
    );

    this.logActivity(actor, "UPDATE_VIDEO", "video", `Cập nhật thông tin video: "${target.title}"`, target.id);
    return { success: true, video: target };
  }

  deleteVideo(actor: UserAccount, id: string): { success: boolean; error?: string } {
    this.assertContentPermission(actor, "manage_videos");

    const videos = this.getVideos(actor);
    const target = videos.find((v) => v.id === id);
    if (!target) return { success: false, error: "Không tìm thấy video." };

    const updated = videos.filter((v) => v.id !== id);
    this.setStorage(STORAGE_KEY_VIDEOS, updated);

    this.logActivity(actor, "DELETE_VIDEO", "video", `Xóa video: "${target.title}"`, id);
    return { success: true };
  }

  // ==================== 4. ALBUMS & IMAGES MANAGEMENT ====================
  getAlbums(): ImageAlbum[] {
    return this.getStorage<ImageAlbum[]>(STORAGE_KEY_ALBUMS, INITIAL_ALBUMS);
  }

  createAlbum(
    actor: UserAccount,
    name: string,
    description: string,
    topicId?: number
  ): { success: boolean; album?: ImageAlbum; error?: string } {
    this.assertContentPermission(actor, "manage_images");

    if (!name.trim()) return { success: false, error: "Vui lòng nhập tên album ảnh!" };

    const albums = this.getAlbums();
    const newAlbum: ImageAlbum = {
      id: "album-" + Date.now(),
      name: name.trim(),
      description: description.trim(),
      topicId,
      createdAt: new Date().toISOString(),
      createdBy: actor.fullName,
    };

    this.setStorage(STORAGE_KEY_ALBUMS, [...albums, newAlbum]);
    this.logActivity(actor, "CREATE_ALBUM", "image", `Tạo album ảnh mới: "${newAlbum.name}"`, newAlbum.id);

    return { success: true, album: newAlbum };
  }

  getImages(actor?: UserAccount | null, albumIdFilter?: string): GalleryImageItem[] {
    const list = this.getStorage<GalleryImageItem[]>(STORAGE_KEY_IMAGES, INITIAL_IMAGES);
    let filtered = list;
    if (!actor) {
      filtered = filtered.filter((i) => i.status === "published");
    }
    if (albumIdFilter && albumIdFilter !== "all") {
      filtered = filtered.filter((i) => i.albumId === albumIdFilter);
    }
    return filtered;
  }

  getPublicImages(): GalleryImageItem[] {
    return this.getImages(null);
  }

  createImage(
    actor: UserAccount,
    data: {
      albumId: string;
      title: string;
      caption: string;
      sourceCredit: string;
      topicId: number;
      imageUrl: string;
      format: "jpg" | "png" | "webp";
      fileSizeKb?: number;
      status?: ContentStatus;
    }
  ): { success: boolean; image?: GalleryImageItem; error?: string } {
    this.assertContentPermission(actor, "manage_images");

    if (!data.title.trim() || !data.imageUrl.trim()) {
      return { success: false, error: "Vui lòng nhập tiêu đề và tệp ảnh hợp lệ." };
    }

    const images = this.getImages(actor);
    const albums = this.getAlbums();
    const targetAlbum = albums.find((a) => a.id === data.albumId) || albums[0];
    const topic = OFFICIAL_TOPICS.find((t) => t.id === data.topicId) || OFFICIAL_TOPICS[0];

    const now = new Date().toISOString();
    let initialStatus: ContentStatus = data.status || "draft";
    if (actor.role !== "super_admin" && initialStatus === "published") {
      initialStatus = "pending_approval";
    }

    const newImg: GalleryImageItem = {
      id: "img-" + Date.now(),
      albumId: targetAlbum.id,
      albumName: targetAlbum.name,
      title: data.title.trim(),
      caption: data.caption.trim(),
      sourceCredit: data.sourceCredit.trim() || actor.fullName,
      topicId: topic.id,
      topicTitle: topic.title,
      imageUrl: data.imageUrl,
      format: data.format,
      fileSizeKb: data.fileSizeKb || 150,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.fullName,
    };

    this.setStorage(STORAGE_KEY_IMAGES, [newImg, ...images]);
    this.logActivity(
      actor,
      "UPLOAD_IMAGE",
      "image",
      `Tải lên hình ảnh: "${newImg.title}" vào album "${targetAlbum.name}"`,
      newImg.id
    );

    return { success: true, image: newImg };
  }

  deleteImage(actor: UserAccount, id: string): { success: boolean; error?: string } {
    this.assertContentPermission(actor, "manage_images");

    const images = this.getImages(actor);
    const target = images.find((i) => i.id === id);
    if (!target) return { success: false, error: "Không tìm thấy hình ảnh." };

    const updated = images.filter((i) => i.id !== id);
    this.setStorage(STORAGE_KEY_IMAGES, updated);

    this.logActivity(actor, "DELETE_IMAGE", "image", `Xóa ảnh "${target.title}"`, id);
    return { success: true };
  }

  // ==================== 5. APPROVAL WORKFLOW ====================
  changeContentStatus(
    actor: UserAccount,
    type: "question" | "post" | "video" | "image",
    id: string,
    newStatus: ContentStatus,
    reason?: string
  ): { success: boolean; error?: string } {
    // Only super_admin has final approval rights
    if ((newStatus === "approved" || newStatus === "published") && actor.role !== "super_admin") {
      return { success: false, error: "Bảo mật: Chỉ Admin chính của trường mới có quyền Duyệt hoặc Xuất bản công khai nội dung!" };
    }

    const now = new Date().toISOString();

    if (type === "question") {
      const items = this.getQuestions(actor);
      const target = items.find((q) => q.id === id);
      if (!target) return { success: false, error: "Không tìm thấy câu hỏi." };
      target.status = newStatus;
      target.updatedAt = now;
      target.updatedBy = actor.fullName;
      this.setStorage(STORAGE_KEY_QUESTIONS, items);
      this.logActivity(actor, "STATUS_CHANGE_QUESTION", "question", `Thay đổi trạng thái câu hỏi [${target.code}] sang "${newStatus}"${reason ? ` (Lý do: ${reason})` : ""}`, target.id);
      return { success: true };
    }

    if (type === "post") {
      const items = this.getPosts(actor);
      const target = items.find((p) => p.id === id);
      if (!target) return { success: false, error: "Không tìm thấy bài viết." };
      target.status = newStatus;
      target.updatedAt = now;
      target.updatedBy = actor.fullName;
      this.setStorage(STORAGE_KEY_POSTS, items);
      this.logActivity(actor, "STATUS_CHANGE_POST", "post", `Thay đổi trạng thái bài viết "${target.title}" sang "${newStatus}"${reason ? ` (Lý do: ${reason})` : ""}`, target.id);
      return { success: true };
    }

    if (type === "video") {
      const items = this.getVideos(actor);
      const target = items.find((v) => v.id === id);
      if (!target) return { success: false, error: "Không tìm thấy video." };
      target.status = newStatus;
      target.updatedAt = now;
      target.updatedBy = actor.fullName;
      this.setStorage(STORAGE_KEY_VIDEOS, items);
      this.logActivity(actor, "STATUS_CHANGE_VIDEO", "video", `Thay đổi trạng thái video "${target.title}" sang "${newStatus}"${reason ? ` (Lý do: ${reason})` : ""}`, target.id);
      return { success: true };
    }

    if (type === "image") {
      const items = this.getImages(actor);
      const target = items.find((img) => img.id === id);
      if (!target) return { success: false, error: "Không tìm thấy hình ảnh." };
      target.status = newStatus;
      target.updatedAt = now;
      target.updatedBy = actor.fullName;
      this.setStorage(STORAGE_KEY_IMAGES, items);
      this.logActivity(actor, "STATUS_CHANGE_IMAGE", "image", `Thay đổi trạng thái ảnh "${target.title}" sang "${newStatus}"${reason ? ` (Lý do: ${reason})` : ""}`, target.id);
      return { success: true };
    }

    return { success: false, error: "Loại nội dung không hợp lệ." };
  }

  getPendingApprovals(actor: UserAccount): {
    questions: ManageableQuestion[];
    posts: ArticlePost[];
    videos: MediaVideoItem[];
    images: GalleryImageItem[];
    total: number;
  } {
    if (actor.role !== "super_admin" && !adminService.hasPermission(actor, "view_reports")) {
      return { questions: [], posts: [], videos: [], images: [], total: 0 };
    }

    const questions = this.getQuestions(actor).filter((q) => q.status === "pending_approval");
    const posts = this.getPosts(actor).filter((p) => p.status === "pending_approval");
    const videos = this.getVideos(actor).filter((v) => v.status === "pending_approval");
    const images = this.getImages(actor).filter((i) => i.status === "pending_approval");

    return {
      questions,
      posts,
      videos,
      images,
      total: questions.length + posts.length + videos.length + images.length,
    };
  }

  getContentStats() {
    const questions = this.getQuestions(adminService.getCurrentSessionUser());
    const posts = this.getPosts(adminService.getCurrentSessionUser());
    const videos = this.getVideos(adminService.getCurrentSessionUser());
    const images = this.getImages(adminService.getCurrentSessionUser());

    const pendingCount =
      questions.filter((q) => q.status === "pending_approval").length +
      posts.filter((p) => p.status === "pending_approval").length +
      videos.filter((v) => v.status === "pending_approval").length +
      images.filter((i) => i.status === "pending_approval").length;

    return {
      totalQuestions: questions.length,
      publishedQuestions: questions.filter((q) => q.status === "published").length,
      totalPosts: posts.length,
      publishedPosts: posts.filter((p) => p.status === "published").length,
      totalVideos: videos.length,
      publishedVideos: videos.filter((v) => v.status === "published").length,
      totalImages: images.length,
      publishedImages: images.filter((i) => i.status === "published").length,
      pendingApprovals: pendingCount,
    };
  }

  private assertContentPermission(user: UserAccount, permission: AdminPermission): void {
    const sessionUser = adminService.getSessionActor(user);
    if (!sessionUser) {
      throw new Error("LỖI BẢO MẬT: Cần phiên đăng nhập hợp lệ để quản trị nội dung.");
    }
    if (sessionUser.role === "teacher") {
      // Giáo viên được phép đề xuất câu hỏi, soạn bài viết, đề xuất video & hình ảnh vào hàng đợi phê duyệt
      return;
    }
    if (!adminService.hasPermission(sessionUser, permission)) {
      throw new Error(`LỖI BẢO MẬT: Tài khoản của bạn không được phân quyền "${permission}" để quản trị nội dung này!`);
    }
  }

  private logActivity(
    actor: UserAccount,
    action: string,
    entity: "question" | "post" | "video" | "image" | "system",
    details: string,
    entityId?: string
  ): void {
    // Forward to internal logs via adminService
    try {
      const logs = (adminService as any).getInternalActivityLogs?.() || [];
      const newLog = {
        id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        schoolId: "school-thcs-quang-chau",
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        action,
        entity,
        entityId,
        details,
      };
      const updated = [newLog, ...logs].slice(0, 500);
      if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
        window.localStorage.setItem("thcs_quang_chau_admin_logs", JSON.stringify(updated));
      }
    } catch (e) {
      console.warn("Log forward notice:", e);
    }
  }
}

export const contentService = new ContentService();
