import { useState } from "react";
import { TOPICS_DATA, TopicItem } from "../data/topicsData";
import { contentService } from "../services/contentService";
import { Compass, Sparkles, HeartHandshake, GraduationCap, Rocket, Scale, HelpCircle, Check, X, BookOpen, Lightbulb, ArrowRight } from "lucide-react";

interface KnowledgeSectionProps {
  setActiveTab: (tab: string) => void;
}

const ICON_MAP: Record<string, any> = {
  Compass,
  Sparkles,
  HeartHandshake,
  GraduationCap,
  Rocket,
  Scale,
};

export default function KnowledgeSection({ setActiveTab }: KnowledgeSectionProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<number>(1);
  const [activeMythIndex, setActiveMythIndex] = useState<number | null>(null);

  const activeTopic: TopicItem = TOPICS_DATA.find((t) => t.id === selectedTopicId) || TOPICS_DATA[0];
  const TopicIcon = ICON_MAP[activeTopic.icon] || BookOpen;

  return (
    <div className="space-y-12 py-6 pb-20">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-light text-brand text-xs font-bold">
          <Compass className="w-3.5 h-3.5" />
          <span>Kiến thức nền tảng</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">
          Kiến thức về bình đẳng giới
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Trang bị kiến thức khoa học, chuẩn xác từ Luật Bình đẳng giới Việt Nam và các tài liệu giáo dục quốc tế, giúp học sinh THCS tự tin nhận diện và đẩy lùi mọi định kiến.
        </p>
      </div>

      {/* Interactive 6 Topics Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {TOPICS_DATA.map((topic) => {
            const Icon = ICON_MAP[topic.icon] || BookOpen;
            const isSelected = topic.id === selectedTopicId;
            return (
              <button
                key={topic.id}
                onClick={() => {
                  setSelectedTopicId(topic.id);
                  setActiveMythIndex(null);
                }}
                className={`p-3 rounded-xl text-left transition-all flex flex-col justify-between cursor-pointer border ${
                  isSelected
                    ? "bg-gradient-to-br from-blue-600 to-teal-600 text-white shadow-md border-transparent font-bold"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-100"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${isSelected ? "bg-white/20 text-white" : "text-slate-400 bg-white"}`}>
                    {topic.code}
                  </span>
                  <Icon className={`w-4 h-4 ${isSelected ? "text-amber-200" : "text-slate-400"}`} />
                </div>
                <p className="text-xs font-bold line-clamp-2 leading-snug">
                  {topic.title}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Topic Content Dashboard */}
      <div className="space-y-8">
        {/* Topic Title & Summary Hero */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <TopicIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">{activeTopic.badge} · {activeTopic.code}</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{activeTopic.title}</h2>
              </div>
            </div>

            <p className="text-base text-slate-700 leading-relaxed font-normal">
              {activeTopic.summary}
            </p>

            {/* Official Objectives from JSON */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Mục tiêu trọng tâm của chủ đề:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeTopic.objectives.map((obj, oIdx) => (
                  <div key={oIdx} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                    <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Message Callout */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-teal-50 border border-teal-200 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Thông điệp vàng của chủ đề</p>
                <p className="text-sm font-bold text-teal-800 italic">"{activeTopic.targetMessage}"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deep Dive Section: Comparison or Concepts */}
        {activeTopic.id === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-1">
              <h3 className="text-xl font-bold text-slate-900">Bảng So Sánh Khoa Học: Giới Tính vs Giới</h3>
              <p className="text-xs sm:text-sm text-slate-500">Quy tắc vàng phân biệt giữa yếu tố sinh học tự nhiên và chuẩn mực xã hội</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Giới tính (Sex) */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h4 className="text-lg font-bold text-blue-900">Giới Tính (Sex) - Bẩm Sinh</h4>
                </div>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Nguồn gốc:</strong> Do di truyền sinh học (nhiễm sắc thể XX/XY, hormone, cơ quan sinh sản).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Tính chất:</strong> Bẩm sinh, tự nhiên và cố định, không thay đổi theo thời gian hay không gian văn hóa.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Ví dụ:</strong> Chỉ nữ giới mới có khả năng mang thai và sinh nở; nam giới có thanh quản phát triển tạo giọng trầm khi dậy thì.</span>
                  </li>
                </ul>
              </div>

              {/* Giới (Gender) */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h4 className="text-lg font-bold text-teal-900">Giới (Gender) - Xã Hội</h4>
                </div>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span><strong>Nguồn gốc:</strong> Do xã hội, phong tục, thói quen và giáo dục gia đình hình thành nên.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span><strong>Tính chất:</strong> Có thể học hỏi, thay đổi và khác nhau giữa các nền văn hóa, các thời kỳ lịch sử.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span><strong>Ví dụ:</strong> Quan niệm 'con gái phải làm việc nhà, con trai phải làm việc lớn'; hay 'con gái thích màu hồng, con trai thích màu xanh'.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 3 Core Concepts Cards */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>Các Khái Niệm Trọng Tâm Cần Nắm Vững</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeTopic.keyConcepts.map((concept, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                    0{idx + 1}
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{concept.term}</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{concept.definition}</p>
                </div>
                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                  <strong className="text-slate-700 block mb-1">Ví dụ thực tế học đường:</strong>
                  <span>{concept.example}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Myth vs Fact Interactive Cards */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <span>Giải Mã Lời Đồn: Nhận Thức Sai vs Sự Thật Khoa Học</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">Bấm vào từng thẻ để kiểm tra xem em có từng mắc phải định kiến này không nhé!</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 w-fit">
              Tương tác tư duy
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTopic.mythsVsFacts.map((item, idx) => {
              const isOpen = activeMythIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 overflow-hidden transition-all bg-slate-50/50"
                >
                  {/* The Myth */}
                  <div className="p-5 border-b border-slate-200 bg-rose-50/40 space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 text-xs font-bold uppercase">
                      <X className="w-4 h-4 text-rose-600" />
                      <span>Quan niệm sai lầm (Định kiến)</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 italic">
                      "{item.myth}"
                    </p>
                  </div>

                  {/* The Fact */}
                  <div className="p-5 space-y-3 bg-white">
                    <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Sự thật khoa học & Tiến bộ</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {item.fact}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <strong>Giải thích sư phạm:</strong> {item.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Tips & Statistics Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Action Tips */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <span>Gợi Ý Hành Động Cụ Thể Dành Cho Học Sinh THCS</span>
            </h3>
            <div className="space-y-3">
              {activeTopic.actionTips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-slate-700">{tip}</p>
                </div>
              ))}
            </div>
            {activeTopic.legalBasis && (
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                <strong>Căn cứ pháp lý:</strong> {activeTopic.legalBasis}
              </div>
            )}
          </div>

          {/* Quick Stat Card */}
          <div className="lg:col-span-4 bg-gradient-to-br from-blue-700 to-teal-800 rounded-2xl p-6 text-white shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-teal-200">
                Con số biết nói
              </span>
              <p className="text-4xl font-extrabold text-amber-200 mt-2 font-mono">
                {activeTopic.statsFact.stat}
              </p>
              <p className="text-sm font-semibold text-white leading-snug">
                {activeTopic.statsFact.label}
              </p>
            </div>
            <div className="pt-4 border-t border-white/15 text-xs text-slate-300">
              Nguồn: {activeTopic.statsFact.source}
            </div>
          </div>
        </div>

        {/* Published Articles from Teachers & Students */}
        <PublishedArticlesSection activeTopicId={selectedTopicId} />

        {/* Bottom Fast Jump CTA */}
        <div className="bg-gradient-to-r from-teal-500 to-blue-600 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
          <div className="text-center sm:text-left">
            <h4 className="text-lg font-bold">Em đã sẵn sàng thử tài kiểm tra kiến thức?</h4>
            <p className="text-xs sm:text-sm text-teal-100">Hãy vận dụng kiến thức vừa học vào ngân hàng câu hỏi trắc nghiệm hoặc xử lý 10 tình huống thực tế!</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => setActiveTab("situations")}
              className="px-4 py-2.5 text-xs font-bold text-teal-900 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Xem 10 tình huống
            </button>
            <button
              onClick={() => setActiveTab("quiz")}
              className="px-4 py-2.5 text-xs font-bold text-slate-900 bg-amber-300 hover:bg-amber-400 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Vào thi trắc nghiệm</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent to display published articles
function PublishedArticlesSection({ activeTopicId }: { activeTopicId: number }) {
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const articles = contentService.getPublicPosts();
  const relevantArticles = articles.filter(
    (a) => a.topicId === activeTopicId || activeTopicId === 0
  );

  if (relevantArticles.length === 0) return null;

  return (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-600" />
            <span>Bài Viết Chuyên Đề & Góc Nhìn Giáo Dục</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Các bài viết, chia sẻ kinh nghiệm và cẩm nang do thầy cô cùng học sinh THCS Quảng Châu thực hiện
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
          {relevantArticles.length} bài viết
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {relevantArticles.map((article) => (
          <div
            key={article.id}
            onClick={() => setSelectedArticle(article)}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="h-40 bg-slate-100 overflow-hidden relative">
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-950/70 text-white text-[10px] font-bold backdrop-blur-xs">
                {article.topicTitle}
              </span>
            </div>
            <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2 leading-snug">
                  {article.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                  {article.summary}
                </p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span className="truncate max-w-[150px] font-medium text-slate-600">
                  {article.author}
                </span>
                <span className="text-teal-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Đọc tiếp</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reader Modal */}
      {selectedArticle && (
        <div
          onClick={() => setSelectedArticle(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-teal-600 uppercase">
                {selectedArticle.topicTitle} · Trường THCS Quảng Châu
              </span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="h-64 rounded-2xl overflow-hidden shadow-xs">
                <img
                  src={selectedArticle.coverImage}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                  {selectedArticle.title}
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span>Tác giả: <strong className="text-slate-700">{selectedArticle.author}</strong></span>
                  <span>Ngày đăng: {new Date(selectedArticle.createdAt).toLocaleDateString("vi-VN")}</span>
                </div>
              </div>

              {selectedArticle.summary && (
                <div className="p-4 rounded-xl bg-teal-50 border-l-4 border-teal-500 text-xs sm:text-sm text-teal-950 font-medium italic">
                  {selectedArticle.summary}
                </div>
              )}

              <div
                className="prose prose-sm max-w-none text-slate-800 space-y-3 leading-relaxed text-xs sm:text-sm pt-2 border-t border-slate-100"
                dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2 rounded-xl text-white bg-slate-900 hover:bg-slate-800 font-bold text-xs"
              >
                Đóng bài đọc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
