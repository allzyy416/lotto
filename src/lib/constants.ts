export const BALL_MAX = 45;
export const PICK_COUNT = 6;
export const RECENT_WINDOW = 20;
export const TYPICAL_SUM: [number, number] = [100, 175];
export const LOW_MAX = 22;

export const BANDS = [
  { id: 0, label: "1–10", min: 1, max: 10 },
  { id: 1, label: "11–20", min: 11, max: 20 },
  { id: 2, label: "21–30", min: 21, max: 30 },
  { id: 3, label: "31–40", min: 31, max: 40 },
  { id: 4, label: "41–45", min: 41, max: 45 },
] as const;

export const RANK_LABEL: Record<number, string> = {
  0: "낙첨",
  1: "1등",
  2: "2등",
  3: "3등",
  4: "4등",
  5: "5등",
};

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export const OFFICIAL_RESULT_URL = "https://www.dhlottery.co.kr/gameResult.do?method=byWin";
export const DATA_LATEST_URL = "https://smok95.github.io/lotto/results/latest.json";
export const DATA_ROUND_URL = (n: number) => `https://smok95.github.io/lotto/results/${n}.json`;

export function ballColor(n: number): string {
  if (n <= 10) return "#f2c94c";
  if (n <= 20) return "#2d9cdb";
  if (n <= 30) return "#eb5757";
  if (n <= 40) return "#9aa0a8";
  return "#27ae60";
}

export function ballInk(n: number): string {
  if (n <= 10) return "#3a2d08";
  return "#0c1017";
}
