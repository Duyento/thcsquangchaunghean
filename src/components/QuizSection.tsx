import { useState, useMemo } from "react";
import { QUIZ_QUESTIONS, QuizQuestion } from "../data/quizData";
import { contentService } from "../services/contentService";
import { ORIGINAL_JSON_FILE_PATH } from "../data/officialData";
import { Award, CheckCircle2, XCircle, RotateCcw, ArrowRight, ArrowLeft, HelpCircle, Trophy, Sparkles, Filter, List, Play, FileText, Download } from "lucide-react";

interface QuizSectionProps {
  setActiveTab: (tab: string) => void;
}

const letterToIndex = (letter: "A" | "B" | "C" | "D"): number => {
  switch (letter) {
    case "A": return 0;
    case "B": return 1;
    case "C": return 2;
    case "D": return 3;
    default: return 0;
  }
};

export default function QuizSection({ setActiveTab }: QuizSectionProps) {
  // Topic filter: 0 means all questions, 1-6 means specific topic
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"step" | "list">("step");

  // Load published questions dynamically from contentService (fallbacks to default 30 questions)
  const publishedQuestionsList: QuizQuestion[] = useMemo(() => {
    const raw = contentService.getPublicQuestions();
    if (raw && raw.length > 0) {
      return raw.map((q, idx) => ({
        id: idx + 1,
        code: q.code,
        topicId: q.topicId,
        topicTitle: q.topicTitle,
        question: q.question,
        options: q.options.map((o) => o.text),
        optionsRaw: q.options,
        correctAnswer: letterToIndex(q.correctOptionId),
        correctOptionId: q.correctOptionId,
        explanation: q.explanation,
        level: q.difficulty,
      }));
    }
    return QUIZ_QUESTIONS;
  }, []);

  const topicOptions = [
    { id: 0, title: `Tất cả ${publishedQuestionsList.length} câu hỏi (Tổng hợp)` },
    { id: 1, title: "Chủ đề 1: Khái niệm Giới & Giới tính" },
    { id: 2, title: "Chủ đề 2: Xóa bỏ định kiến giới" },
    { id: 3, title: "Chủ đề 3: Bình đẳng trong gia đình" },
    { id: 4, title: "Chủ đề 4: Trường học an toàn & STEM" },
    { id: 5, title: "Chủ đề 5: Định hướng nghề nghiệp" },
    { id: 6, title: "Chủ đề 6: Pháp luật & Quyền trẻ em" },
  ];

  const currentQuestions: QuizQuestion[] = selectedTopicFilter === 0
    ? publishedQuestionsList
    : publishedQuestionsList.filter((q) => q.topicId === selectedTopicFilter);


  const currentQ: QuizQuestion = currentQuestions[currentIndex] || currentQuestions[0];
  const currentAnswer = userAnswers[currentQ.id];
  const isAnswered = currentAnswer !== undefined;

  // Score statistics
  const answeredTotal = Object.keys(userAnswers).length;
  const correctCount = currentQuestions.filter(
    (q) => userAnswers[q.id] === q.correctAnswer
  ).length;

  const scorePercentage = currentQuestions.length > 0
    ? Math.round((correctCount / currentQuestions.length) * 100)
    : 0;

  const handleSelectOption = (qId: number, optIndex: number) => {
    if (userAnswers[qId] !== undefined) return; // already locked
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: optIndex,
    }));
  };

  const handleReset = () => {
    setUserAnswers({});
    setCurrentIndex(0);
    setIsFinished(false);
  };

  const handleFinishQuiz = () => {
    setIsFinished(true);
    window.scrollTo({ top: 100, behavior: "smooth" });
  };

  const getRankBadge = (score: number, total: number) => {
    const pct = (score / total) * 100;
    if (pct >= 90) {
      return {
        title: "Đại Sứ Bình Đẳng Giới Xuất Sắc",
        color: "text-amber-500 bg-amber-50 border-amber-300",
        stars: "★★★★★",
        message: "Xuất sắc! Em nắm vững kiến thức pháp luật và tư duy bình đẳng giới sâu sắc. Hãy tiếp tục lan tỏa năng lượng tích cực này tới toàn trường THCS Quảng Châu!",
      };
    } else if (pct >= 75) {
      return {
        title: "Chiến Sĩ Tuyên Truyền Giỏi",
        color: "text-teal-600 bg-teal-50 border-teal-300",
        stars: "★★★★☆",
        message: "Rất tốt! Em đã hiểu đúng hầu hết các khái niệm quan trọng và kỹ năng bình đẳng giới. Xem lại vài câu chưa đúng để hoàn thiện bản thân hơn nhé!",
      };
    } else if (pct >= 50) {
      return {
        title: "Tuyên Truyền Viên Tích Cực",
        color: "text-blue-600 bg-blue-50 border-blue-300",
        stars: "★★★☆☆",
        message: "Khá tốt! Em đã có nhận thức tích cực về bình đẳng giới. Đọc kỹ lại phần giải thích chi tiết ở Chuyên mục 2 để bứt phá điểm số cao hơn nhé!",
      };
    } else {
      return {
        title: "Học Viên Cần Mẫn",
        color: "text-slate-700 bg-slate-100 border-slate-300",
        stars: "★★☆☆☆",
        message: "Đừng nản lòng nhé! Bình đẳng giới là một hành trình học hỏi. Hãy quay lại Chuyên mục 2: 'Hiểu đúng về bình đẳng giới' để ôn tập và thử lại nào!",
      };
    }
  };

  const rank = getRankBadge(correctCount, currentQuestions.length);

  return (
    <div className="space-y-10 py-6 pb-20">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
          <Award className="w-3.5 h-3.5" />
          <span>Chuyên mục 4: Đấu trí kiến thức</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Thử Thách Bình Đẳng Giới
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Ngân hàng 30 câu hỏi trắc nghiệm chuẩn hóa phân bổ theo 6 chủ đề giáo dục. Có giải thích sư phạm chi tiết sau từng lựa chọn để học sinh hiểu sâu và nhớ lâu.
        </p>
      </div>

      {/* Control Panel: Topic Filter & View Mode */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Topic Select Dropdown / Buttons */}
          <div className="flex items-center gap-2 flex-1">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedTopicFilter}
              onChange={(e) => {
                setSelectedTopicFilter(Number(e.target.value));
                setCurrentIndex(0);
                setIsFinished(false);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              {topicOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.title} ({opt.id === 0 ? "30 câu" : "5 câu"})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle View Mode (Step by Step vs Full List) */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setViewMode("step")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "step" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Thi từng câu</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Xem toàn bộ</span>
              </button>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Real-time Live Score */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>
              Đã trả lời: <strong className="text-slate-900">{answeredTotal}/{currentQuestions.length}</strong> câu
            </span>
            <span className="text-teal-600">
              Đúng: <strong>{correctCount}</strong> câu ({scorePercentage}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-teal-500 transition-all duration-300"
              style={{ width: `${(answeredTotal / currentQuestions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Finished Result Showcase Card */}
      {isFinished && (
        <div className="bg-white rounded-3xl border-2 border-teal-400 p-8 sm:p-10 shadow-lg text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-900 flex items-center justify-center mx-auto shadow-md">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
              KẾT QUẢ THỬ THÁCH BÌNH ĐẲNG GIỚI
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {correctCount} / {currentQuestions.length} Câu Đúng ({scorePercentage}%)
            </h2>
            <div className={`inline-block px-4 py-1.5 rounded-full border text-sm font-bold ${rank.color}`}>
              {rank.stars} {rank.title}
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            {rank.message}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Làm lại thử thách</span>
            </button>
            <button
              onClick={() => {
                setIsFinished(false);
                setViewMode("list");
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-2 cursor-pointer"
            >
              <List className="w-4 h-4" />
              <span>Xem lại đáp án giải thích</span>
            </button>
            <button
              onClick={() => setActiveTab("commitment")}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-teal-700" />
              <span>Ký cam kết hành động</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 1: STEP-BY-STEP SINGLE QUESTION MODE */}
      {viewMode === "step" && !isFinished && (
        <div className="space-y-6">
          {/* Question Fast Picker Dots */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-1.5">
            {currentQuestions.map((q, idx) => {
              const ans = userAnswers[q.id];
              const isCurr = idx === currentIndex;
              let dotColor = "bg-slate-100 text-slate-600 border-slate-200";
              if (ans !== undefined) {
                dotColor = ans === q.correctAnswer ? "bg-emerald-500 text-white border-transparent" : "bg-rose-500 text-white border-transparent";
              }
              if (isCurr) {
                dotColor += " ring-2 ring-blue-500 ring-offset-1";
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center ${dotColor}`}
                >
                  {q.id}
                </button>
              );
            })}
          </div>

          {/* Current Question Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-8">
            {/* Header info */}
            <div className="space-y-2 border-b border-slate-100 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  MÃ: {currentQ.code} · CÂU HỎI {currentQ.id}/30
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {currentQ.topicTitle}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                    Mức độ: {currentQ.level}
                  </span>
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug pt-2">
                {currentQ.question}
              </h2>
            </div>

            {/* 4 Options Grid */}
            <div className="space-y-3">
              {currentQ.options.map((optionText, optIdx) => {
                const isSelected = currentAnswer === optIdx;
                const isCorrect = optIdx === currentQ.correctAnswer;

                let btnStyle = "bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/20";
                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20";
                  } else if (isSelected && !isCorrect) {
                    btnStyle = "bg-rose-50 border-rose-400 ring-2 ring-rose-500/20";
                  } else {
                    btnStyle = "bg-slate-50 border-slate-200 opacity-60";
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(currentQ.id, optIdx)}
                    disabled={isAnswered}
                    className={`w-full p-4 sm:p-5 rounded-2xl border text-left flex items-start gap-3 transition-all ${btnStyle} ${
                      !isAnswered ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                      isAnswered
                        ? isCorrect
                          ? "bg-emerald-600 text-white"
                          : isSelected
                          ? "bg-rose-600 text-white"
                          : "bg-slate-200 text-slate-600"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </div>

                    <div className="flex-1">
                      <span className="text-sm sm:text-base font-semibold text-slate-800">
                        {optionText}
                      </span>
                    </div>

                    {isAnswered && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pedagogical Explanation Box (Shown ONLY after answering) */}
            {isAnswered && (
              <div className={`p-5 sm:p-6 rounded-2xl border space-y-2.5 ${
                currentAnswer === currentQ.correctAnswer
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                  : "bg-amber-50/70 border-amber-200 text-amber-900"
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {currentAnswer === currentQ.correctAnswer ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Chính xác! Lời giải thích khoa học sư phạm:</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="w-5 h-5 text-amber-600" />
                      <span>Chưa chính xác! Cùng xem phân tích đáp án nhé:</span>
                    </>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                  {currentQ.explanation}
                </p>
              </div>
            )}

            {/* Navigation Bottom Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentIndex === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Câu trước</span>
              </button>

              <span className="text-xs font-semibold text-slate-500">
                Câu {currentIndex + 1} / {currentQuestions.length}
              </span>

              {currentIndex < currentQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <span>Câu tiếp theo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleFinishQuiz}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Hoàn thành & Xem điểm</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: REVIEW ALL 30 QUESTIONS LIST */}
      {viewMode === "list" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Danh Sách {currentQuestions.length} Câu Hỏi & Lời Giải Chi Tiết
            </h3>
            <span className="text-xs text-slate-500">
              Chọn đáp án để kiểm tra và xem giải thích
            </span>
          </div>

          <div className="space-y-6">
            {currentQuestions.map((q, idx) => {
              const userAns = userAnswers[q.id];
              const answered = userAns !== undefined;

              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-mono font-bold text-xs flex items-center justify-center">
                        {q.code} · Câu {q.id}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{q.topicTitle}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      Mức độ: {q.level}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 leading-snug">
                    {q.question}
                  </h4>

                  {/* 4 Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {q.options.map((optText, optIdx) => {
                      const isSelected = userAns === optIdx;
                      const isCorrect = optIdx === q.correctAnswer;

                      let style = "bg-slate-50 border-slate-200 hover:bg-blue-50/30";
                      if (answered) {
                        if (isCorrect) style = "bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold";
                        else if (isSelected && !isCorrect) style = "bg-rose-50 border-rose-300 text-rose-950 font-semibold";
                        else style = "bg-slate-50 border-slate-200 opacity-60";
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          disabled={answered}
                          className={`p-3 rounded-xl border text-left flex items-start gap-2.5 text-xs sm:text-sm transition-all ${style}`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            answered && isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{optText}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pedagogical Explanation */}
                  {answered && (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs sm:text-sm space-y-1">
                      <p className="font-bold text-blue-900">
                        {userAns === q.correctAnswer ? "✓ Đáp án chính xác!" : "✗ Đáp án đúng: " + String.fromCharCode(65 + q.correctAnswer)}
                      </p>
                      <p className="text-slate-700 leading-relaxed font-normal">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pt-6">
            <button
              onClick={handleFinishQuiz}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md cursor-pointer"
            >
              Tổng kết điểm số & Xem danh hiệu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
