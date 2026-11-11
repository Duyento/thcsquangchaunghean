import { OFFICIAL_QUESTIONS, OFFICIAL_TOPICS, OfficialQuestion } from "./officialData";

export interface QuizQuestion {
  id: number;
  code: string;
  topicId: number;
  topicTitle: string;
  question: string;
  options: string[];
  optionsRaw: { id: "A" | "B" | "C" | "D"; text: string }[];
  correctAnswer: number; // 0 for A, 1 for B, 2 for C, 3 for D
  correctOptionId: "A" | "B" | "C" | "D";
  explanation: string;
  level: "Nhận biết" | "Thông hiểu" | "Vận dụng";
}

const letterToIndex = (letter: "A" | "B" | "C" | "D"): number => {
  switch (letter) {
    case "A": return 0;
    case "B": return 1;
    case "C": return 2;
    case "D": return 3;
  }
};

export const QUIZ_QUESTIONS: QuizQuestion[] = OFFICIAL_QUESTIONS.map((q: OfficialQuestion, idx: number) => {
  const topic = OFFICIAL_TOPICS.find((t) => t.id === q.topicId);
  return {
    id: idx + 1,
    code: q.id,
    topicId: q.topicId,
    topicTitle: topic ? topic.title : `Chủ đề ${q.topicId}`,
    question: q.question,
    options: q.options.map((opt) => opt.text),
    optionsRaw: q.options,
    correctAnswer: letterToIndex(q.correctOptionId),
    correctOptionId: q.correctOptionId,
    explanation: q.explanation,
    level: q.difficulty,
  };
});
