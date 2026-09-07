export interface Draw {
  drawNo: number;
  date: string;
  numbers: number[];
  bonus: number;
  firstPrize: number;
  firstWinners: number;
  sales: number;
}

export type Strategy = "balanced" | "hot" | "frequency" | "mixed";
export type View = "home" | "analysis" | "generate" | "saved" | "alerts";
export type NumberTag = "hot" | "warm" | "cold" | "neutral";

export interface NumberProfile {
  n: number;
  frequencyCount: number;
  frequencyRank: number;
  recentCount: number;
  recentRank: number;
  lastSeenAgo: number;
  tag: NumberTag;
}

export interface CombinationAnalysis {
  oddEven: [number, number];
  lowHigh: [number, number];
  bands: number[];
  sum: number;
  consecutivePairs: number;
  profiles: NumberProfile[];
  vsTypical: {
    oddEvenCommon: boolean;
    sumInTypical: boolean;
    bandSpread: boolean;
  };
  appliedCriteria: string[];
}

export interface GeneratedCombo {
  id: string;
  numbers: number[];
  strategy: Strategy;
  createdAt: string;
  elapsedMs: number;
  analysis: CombinationAnalysis;
}

export interface SavedCombo extends GeneratedCombo {
  targetDrawNo: number;
  comparedDrawNo?: number;
  matches?: number;
  bonusHit?: boolean;
  rank?: number;
}

export interface AlertSettings {
  enabled: boolean;
  weekday: number;
  hour: number;
  minute: number;
  lastNotifiedWeek: string;
}

export interface DataStatus {
  latestDrawNo: number;
  latestDate: string;
  totalDraws: number;
  source: string;
  updatedAt: string;
  refreshState: "idle" | "loading" | "ok" | "error";
  refreshMessage: string;
}

export const VIEWS: { id: View; label: string; hint: string }[] = [
  { id: "home", label: "대시보드", hint: "최신 회차와 데이터 상태" },
  { id: "analysis", label: "통계 분석", hint: "빈도 · 추세 · 분포" },
  { id: "generate", label: "번호 생성", hint: "기준을 반영한 원클릭 조합" },
  { id: "saved", label: "저장 · 비교", hint: "당첨 결과와 일치 확인" },
  { id: "alerts", label: "구매 알림", hint: "다음 추첨 전 검토 알림" },
];

export const STRATEGIES: {
  id: Strategy;
  label: string;
  summary: string;
}[] = [
  {
    id: "balanced",
    label: "균형 조합",
    summary: "홀짝·저고·구간 분포를 과거 전형 구간에 맞추고, 빈도와 최근 추세를 약하게 반영합니다.",
  },
  {
    id: "hot",
    label: "최근 추세",
    summary: "최근 20회에서 자주 나온 번호에 가중치를 둡니다. 최근 흐름을 참고할 때 사용합니다.",
  },
  {
    id: "frequency",
    label: "출현 빈도",
    summary: "전체 회차 출현 횟수가 높은 번호에 가중치를 둡니다. 장기 분포를 참고할 때 사용합니다.",
  },
  {
    id: "mixed",
    label: "혼합",
    summary: "빈도 상위, 최근 핫 번호, 공백이 긴 콜드 번호를 섞어 한쪽으로 치우치지 않게 구성합니다.",
  },
];
