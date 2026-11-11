import { useState } from "react";
import { SITUATIONS_DATA, SituationItem } from "../data/situationsData";
import { BookOpen, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, RotateCcw, Lightbulb, Trophy, Star, Sparkles } from "lucide-react";

interface SituationsSectionProps {
  setActiveTab: (tab: string) => void;
}

export default function SituationsSection({ setActiveTab }: SituationsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedChoices, setSelectedChoices] = useState<Record<number, number>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>("Tất cả");

  const categories = ["Tất cả", "Học đường", "Gia đình", "Không gian mạng", "Ước mơ & Định hướng"];

  const filteredSituations = categoryFilter === "Tất cả"
    ? SITUATIONS_DATA
    : SITUATIONS_DATA.filter((s) => s.category === categoryFilter);

  const currentSituation: SituationItem = filteredSituations[currentIndex] || SITUATIONS_DATA[0];
  const userChoice = selectedChoices[currentSituation.id];
  const isAnswered = userChoice !== undefined;

  // Calculation of best choices made
  const completedCount = Object.keys(selectedChoices).length;
  const bestCount = SITUATIONS_DATA.filter(
    (s) => selectedChoices[s.id] === s.bestOptionIndex
  ).length;

  const handleSelectOption = (optionIndex: number) => {
    if (isAnswered) return; // locked once chosen
    setSelectedChoices((prev) => ({
      ...prev,
      [currentSituation.id]: optionIndex,
    }));
  };

  const handleReset = () => {
    setSelectedChoices({});
    setCurrentIndex(0);
  };

  const handleNext = () => {
    if (currentIndex < filteredSituations.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="space-y-10 py-6 pb-20">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Chuyên mục 3: Kỹ năng thực chiến</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Góc Tình Huống – Em Sẽ Làm Gì?
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          10 tình huống thực tế thường gặp trong đời sống học đường, gia đình và trên mạng xã hội. Hãy đặt mình vào vị trí của nhân vật để đưa ra quyết định bình đẳng, nhân văn và bản lĩnh nhất!
        </p>
      </div>

      {/* Progress & Category Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat);
                  setCurrentIndex(0);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Score Counter */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-slate-500">
              Tiến độ: <strong className="text-slate-800">{completedCount}/10</strong> tình huống
            </span>
            <span className="text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>{bestCount} quyết định xuất sắc</span>
            </span>
            <button
              onClick={handleReset}
              className="text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
              title="Làm lại tất cả tình huống"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại</span>
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tình huống {currentIndex + 1} / {filteredSituations.length}</span>
            <span>{Math.round(((currentIndex + 1) / filteredSituations.length) * 100)}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-blue-600 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / filteredSituations.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Quick Situation Number Navigation Bullets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {filteredSituations.map((sit, idx) => {
            const hasDone = selectedChoices[sit.id] !== undefined;
            const isBestDone = selectedChoices[sit.id] === sit.bestOptionIndex;
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={sit.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center border ${
                  isCurrent
                    ? "border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/30"
                    : hasDone
                    ? isBestDone
                      ? "bg-emerald-500 text-white border-transparent"
                      : "bg-amber-500 text-white border-transparent"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {sit.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Situation Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-8">
        {/* Situation Header */}
        <div className="space-y-3 border-b border-slate-100 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md">
                MÃ: {currentSituation.code} · TÌNH HUỐNG {currentSituation.id}/10
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                Chủ đề: {currentSituation.category}
              </span>
            </div>
            {isAnswered && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                userChoice === currentSituation.bestOptionIndex
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {userChoice === currentSituation.bestOptionIndex ? "★ Xử lý rất xuất sắc!" : "Cần suy ngẫm thêm"}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {currentSituation.title}
          </h2>

          {/* Situation Narrative Story Box */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed text-sm sm:text-base space-y-2">
            <p className="font-serif italic text-slate-700">
              "{currentSituation.story}"
            </p>
          </div>

          {/* The Prompt Question */}
          <div className="pt-2">
            <h3 className="text-base sm:text-lg font-bold text-blue-700 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>{currentSituation.question}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hãy chọn 1 phương án hành động em cho là phù hợp nhất:
            </p>
          </div>
        </div>

        {/* Options List */}
        <div className="space-y-3.5">
          {currentSituation.options.map((option, optIdx) => {
            const isSelected = userChoice === optIdx;
            const isBest = option.isBest;

            let cardStyle = "bg-white border-slate-200 hover:border-teal-400 hover:bg-teal-50/20";
            if (isAnswered) {
              if (isSelected && isBest) {
                cardStyle = "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20";
              } else if (isSelected && !isBest) {
                cardStyle = "bg-rose-50 border-rose-300 ring-2 ring-rose-500/20";
              } else if (isBest) {
                cardStyle = "bg-emerald-50/60 border-emerald-300 border-dashed";
              } else {
                cardStyle = "bg-slate-50 border-slate-200 opacity-60";
              }
            }

            return (
              <div
                key={optIdx}
                onClick={() => handleSelectOption(optIdx)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all text-left flex flex-col gap-2 ${cardStyle} ${
                  !isAnswered ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                    isSelected
                      ? isBest
                        ? "bg-emerald-600 text-white"
                        : "bg-rose-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {String.fromCharCode(65 + optIdx)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className={`text-sm sm:text-base font-semibold leading-relaxed ${
                      isSelected ? "text-slate-900" : "text-slate-800"
                    }`}>
                      {option.text}
                    </p>
                    {isAnswered && (
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                        isBest ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                      }`}>
                        Định hướng: {option.tag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Feedback revealed after selection */}
                {isAnswered && (isSelected || isBest) && (
                  <div className={`mt-2 text-xs sm:text-sm p-3 rounded-xl leading-relaxed ${
                    isBest ? "bg-emerald-100/70 text-emerald-900" : "bg-rose-100/70 text-rose-900"
                  }`}>
                    <strong>{isBest ? "Phân tích hướng xử lý tích cực: " : "Nhận xét phương án này: "}</strong>
                    {option.feedback}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pedagogical Advice & Takeaway Box (Shown after answering) */}
        {isAnswered && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 via-teal-50 to-blue-50 border border-teal-200 space-y-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Lời Khuyên Sư Phạm Cho Tình Huống Này
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {currentSituation.pedagogicalAdvice}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-teal-200 text-center">
              <span className="text-xs font-bold text-teal-600 uppercase">Thông điệp cốt lõi</span>
              <p className="text-base font-extrabold text-teal-900 mt-0.5">
                "{currentSituation.takeawayMessage}"
              </p>
            </div>
          </div>
        )}

        {/* Bottom Pagination & Next Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              currentIndex === 0
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tình huống trước</span>
          </button>

          <div className="text-xs font-semibold text-slate-500">
            {currentIndex + 1} / {filteredSituations.length}
          </div>

          {currentIndex < filteredSituations.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Tình huống tiếp</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setActiveTab("quiz")}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              <span>Chuyển sang làm Trắc nghiệm</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
