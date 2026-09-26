import type { Draw } from "../types";
import { BANDS, RECENT_WINDOW, TYPICAL_SUM } from "./constants";
import { distribution, latestDraw, numberProfiles, topEntries } from "./stats";

function fmtNums(numbers: number[], bonus?: number): string {
  const main = numbers.map((n) => String(n).padStart(2, "0")).join(" ");
  return bonus == null ? main : `${main} +${String(bonus).padStart(2, "0")}`;
}

export function buildAiBrief(draws: Draw[], count: number, bannedKeys: string[]): string {
  const latest = latestDraw(draws);
  const profiles = numberProfiles(draws, RECENT_WINDOW);
  const all = distribution(draws);
  const recentDraws = draws.slice(-RECENT_WINDOW);
  const recent = distribution(recentDraws);
  const freqTop = [...profiles].sort((a, b) => b.frequencyCount - a.frequencyCount || a.n - b.n).slice(0, 10);
  const freqLow = [...profiles].sort((a, b) => a.frequencyCount - b.frequencyCount || a.n - b.n).slice(0, 8);
  const hot = [...profiles].sort((a, b) => b.recentCount - a.recentCount || a.lastSeenAgo - b.lastSeenAgo).slice(0, 10);
  const overdue = [...profiles].sort((a, b) => b.lastSeenAgo - a.lastSeenAgo || a.recentCount - b.recentCount).slice(0, 8);

  const lines = [
    `대상: 동행복권 로또 6/45, 다음 회차 ${latest.drawNo + 1}회`,
    `데이터: ${draws.length}회(1–${latest.drawNo}회), 최신 ${latest.drawNo}회 ${latest.date} ${fmtNums(latest.numbers, latest.bonus)}`,
    `요청 게임 수: ${count}`,
    "",
    "제약",
    "- 각 게임은 1–45 서로 다른 정수 6개, 오름차순",
    "- 게임끼리 완전 동일 세트 금지",
    `- 최근 80회 당첨 세트와 동일 금지: ${bannedKeys.slice(0, 12).join(" | ") || "없음"}`,
    "- 당첨 확률은 모든 조합이 같다. 예측·보장 문구 금지",
    "",
    "물리 추첨 참고(공개 오차값 없음)",
    "- 공은 물리 추첨기와 번호 공으로 뽑힌다. 기기 점검·교체·마모 수치는 공개되지 않는다",
    "- 따라서 특정 공·특정 회차에 보정값을 더하지 말고, 최근 한두 회에 과적합하지 말 것",
    "- 한 구간·한 색대에 4개 이상 몰리지 않게 하고, 게임 간에 구간 커버를 나눌 것",
    "",
    `전체 전형: 합계 평균 ${all.avgSum.toFixed(1)} (참고 구간 ${TYPICAL_SUM[0]}–${TYPICAL_SUM[1]}), 홀수 평균 ${all.avgOdd.toFixed(2)}, 저번호(1–22) 평균 ${all.avgLow.toFixed(2)}`,
    `전체 홀짝 상위: ${topEntries(all.oddEven).map(([k, v]) => `${k} ${v}회`).join(", ")}`,
    `전체 저고 상위: ${topEntries(all.lowHigh).map(([k, v]) => `${k} ${v}회`).join(", ")}`,
    `전체 연속쌍 상위: ${topEntries(all.consecutive).map(([k, v]) => `${k}쌍 ${v}회`).join(", ")}`,
    `전체 구간 공 수: ${BANDS.map((b, i) => `${b.label} ${all.bands[i]}`).join(", ")}`,
    "",
    `최근 ${RECENT_WINDOW}회 합계 평균 ${recent.avgSum.toFixed(1)}, 홀수 평균 ${recent.avgOdd.toFixed(2)}, 저번호 평균 ${recent.avgLow.toFixed(2)}`,
    `최근 홀짝 상위: ${topEntries(recent.oddEven, 4).map(([k, v]) => `${k} ${v}회`).join(", ")}`,
    `최근 구간 공 수: ${BANDS.map((b, i) => `${b.label} ${recent.bands[i]}`).join(", ")}`,
    "",
    `누적 빈도 상위: ${freqTop.map((p) => `${p.n}(${p.frequencyCount})`).join(", ")}`,
    `누적 빈도 하위: ${freqLow.map((p) => `${p.n}(${p.frequencyCount})`).join(", ")}`,
    `최근 ${RECENT_WINDOW}회 많이 나옴: ${hot.map((p) => `${p.n}(${p.recentCount})`).join(", ")}`,
    `공백이 긴 번호: ${overdue.map((p) => `${p.n}(${p.lastSeenAgo}회전)`).join(", ")}`,
    "",
    "최근 8회",
    ...draws.slice(-8).map((d) => `${d.drawNo}: ${fmtNums(d.numbers, d.bonus)}`),
    "",
    `JSON만 답할 것: {"games":[{"numbers":[n,n,n,n,n,n],"reasons":["한글 근거 2개"]}]} 길이 ${count}`,
  ];
  return lines.join("\n");
}
