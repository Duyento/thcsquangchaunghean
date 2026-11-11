import { OFFICIAL_SCENARIOS, OfficialScenario } from "./officialData";

export interface SituationOption {
  id: "A" | "B" | "C";
  text: string;
  isBest: boolean;
  tag: string;
  feedback: string;
}

export interface SituationItem {
  id: number;
  code: string;
  title: string;
  category: string;
  story: string;
  question: string;
  options: SituationOption[];
  bestOptionIndex: number;
  recommendedOptionId: "A" | "B" | "C";
  pedagogicalAdvice: string;
  takeawayMessage: string;
}

const letterToIndex = (letter: "A" | "B" | "C"): number => {
  switch (letter) {
    case "A": return 0;
    case "B": return 1;
    case "C": return 2;
  }
};

export const SITUATIONS_DATA: SituationItem[] = OFFICIAL_SCENARIOS.map((sc: OfficialScenario, idx: number) => {
  const bestIdx = letterToIndex(sc.recommendedOptionId);

  const mappedOptions: SituationOption[] = sc.options.map((opt, optIdx) => {
    const isBest = opt.id === sc.recommendedOptionId;
    return {
      id: opt.id,
      text: opt.text,
      isBest,
      tag: isBest ? "Hành động tích cực & Bình đẳng" : "Cần suy ngẫm thêm",
      feedback: isBest
        ? sc.feedback
        : `Lựa chọn này chưa tối ưu: Cần giải quyết vấn đề theo hướng tôn trọng, công bằng và tôn trọng cơ hội của mọi người thay vì chấp nhận định kiến.`
    };
  });

  return {
    id: idx + 1,
    code: sc.id,
    title: sc.title,
    category: sc.topic,
    story: sc.situation,
    question: "Nếu là bạn trong tình huống này, em sẽ lựa chọn phương án xử lý nào?",
    options: mappedOptions,
    bestOptionIndex: bestIdx,
    recommendedOptionId: sc.recommendedOptionId,
    pedagogicalAdvice: sc.feedback,
    takeawayMessage: sc.feedback,
  };
});
