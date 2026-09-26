import type { GeneratedPension, PensionDraw, Strategy } from "../types";
import { completeJson } from "./openai";
import {
  PENSION_DIGIT_LEN,
  PENSION_GROUPS,
  PENSION_POS_LABEL,
  PENSION_RECENT_WINDOW,
  PENSION_TYPICAL_SUM,
} from "./constants";
import { latestPension } from "./pensionData";
import { pensionProfiles, pensionShape, topDigits } from "./pensionStats";

function uid(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ticketKey(group: number, digits: number[]): string {
  return `${group}:${digits.join("")}`;
}

function pickWeighted(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function positionWeights(strategy: Strategy, all: number[], recent: number[]): number[] {
  return all.map((count, digit) => {
    const freq = 0.4 + count;
    const hot = 0.4 + recent[digit];
    if (strategy === "frequency") return freq * freq;
    if (strategy === "hot") return hot * hot;
    if (strategy === "mixed") return freq * 0.55 + hot * 0.45 + (count === 0 ? 1.1 : 1);
    return freq * 0.6 + hot * 0.4;
  });
}

function groupWeights(strategy: Strategy, all: number[], recent: number[]): number[] {
  return all.map((count, i) => {
    const freq = 0.5 + count;
    const hot = 0.5 + recent[i];
    if (strategy === "frequency") return freq;
    if (strategy === "hot") return hot;
    if (strategy === "mixed") return 1 + (Math.max(...all) - count) * 0.15 + hot * 0.2;
    return freq * 0.6 + hot * 0.4;
  });
}

function shapeOk(digits: number[], strategy: Strategy): boolean {
  const shape = pensionShape(digits);
  const [odd] = shape.oddEven;
  const sumOk = shape.digitSum >= PENSION_TYPICAL_SUM[0] && shape.digitSum <= PENSION_TYPICAL_SUM[1];
  if (strategy === "balanced") {
    return odd >= 2 && odd <= 4 && shape.uniqueDigits >= 4 && shape.consecutivePairs <= 3 && sumOk;
  }
  if (strategy === "mixed") {
    return odd >= 2 && odd <= 4 && shape.uniqueDigits >= 3 && shape.consecutivePairs <= 4;
  }
  return shape.uniqueDigits >= 2 && shape.consecutivePairs <= 5;
}

function analyze(group: number, digits: number[], strategy: Strategy) {
  const shape = pensionShape(digits);
  const criteria: string[] = [`${group}조 + 6자리 번호`];
  if (strategy === "balanced") {
    criteria.push("홀수 2–4개, 서로 다른 숫자 4개 이상, 합계 15–39");
    criteria.push("자리별 전체 빈도와 최근 20회를 약하게 가중");
  } else if (strategy === "hot") {
    criteria.push("최근 20회 자리별 출현에 가중");
  } else if (strategy === "frequency") {
    criteria.push("1회부터 자리별 출현 빈도에 가중");
  } else if (strategy === "ai") {
    criteria.push("GPT가 조 빈도, 자리별 숫자, 끝자리 패턴을 검토");
    criteria.push("모든 조·6자리 조합의 1등 확률은 같습니다. 검토용 제안입니다");
  } else {
    criteria.push("자주 나온 자리 숫자와 적게 나온 조를 섞음");
  }
  return { ...shape, appliedCriteria: criteria };
}

export function generatePensionCombos(draws: PensionDraw[], strategy: Strategy, count = 5): GeneratedPension[] {
  if (strategy === "ai") throw new Error("AI 추첨은 generatePensionAiCombos를 사용하세요.");
  const started = performance.now();
  const profiles = pensionProfiles(draws);
  const banned = new Set(draws.slice(-40).map((d) => ticketKey(d.group, d.digits)));
  const results: GeneratedPension[] = [];
  let guard = 0;

  while (results.length < count && guard < 5000) {
    guard += 1;
    const group = pickWeighted(groupWeights(strategy, profiles.groupCounts, profiles.recentGroupCounts)) + 1;
    const digits = profiles.posCounts.map((all, i) =>
      pickWeighted(positionWeights(strategy, all, profiles.recentPosCounts[i])),
    );
    if (!shapeOk(digits, strategy)) continue;
    const key = ticketKey(group, digits);
    if (banned.has(key)) continue;
    banned.add(key);
    results.push({
      id: uid(),
      group,
      digits,
      strategy,
      createdAt: new Date().toISOString(),
      elapsedMs: 0,
      analysis: analyze(group, digits, strategy),
    });
  }

  const elapsed = Math.max(1, Math.round(performance.now() - started));
  return results.map((item) => ({ ...item, elapsedMs: elapsed }));
}

function buildPensionBrief(draws: PensionDraw[], count: number, banned: string[]): string {
  const latest = latestPension(draws);
  const profiles = pensionProfiles(draws);
  const recent = draws.slice(-8);
  return [
    `대상: 동행복권 연금복권720+, 다음 회차 ${latest.drawNo + 1}회`,
    `데이터: ${draws.length}회(1–${latest.drawNo}회), 최신 ${latest.drawNo}회 ${latest.date} ${latest.group}조 ${latest.digits.join("")} / 보너스 ${latest.bonusDigits.join("")}`,
    `요청 게임 수: ${count}`,
    "",
    "형식: 조는 1–5, 숫자는 0–9 여섯 자리. 자리는 고정이며 같은 숫자가 반복될 수 있다",
    "- 1등: 조+6자리, 2등: 6자리만, 3–7등: 끝에서부터 5–1자리",
    "- 당첨 확률은 모든 조·6자리 조합이 같다. 예측·보장 금지",
    `- 최근 40회 1등 세트 금지: ${banned.slice(0, 10).join(" | ")}`,
    "",
    `조 전체 빈도: ${profiles.groupCounts.map((c, i) => `${i + 1}조 ${c}`).join(", ")}`,
    `조 최근 ${PENSION_RECENT_WINDOW}회: ${profiles.recentGroupCounts.map((c, i) => `${i + 1}조 ${c}`).join(", ")}`,
    ...profiles.posCounts.map(
      (counts, i) =>
        `${PENSION_POS_LABEL[i]}자리 상위 ${topDigits(counts).map((d) => `${d.digit}(${d.count})`).join(", ")} / 최근 ${topDigits(profiles.recentPosCounts[i]).map((d) => `${d.digit}(${d.count})`).join(", ")}`,
    ),
    "",
    "최근 8회",
    ...recent.map((d) => `${d.drawNo}: ${d.group}조 ${d.digits.join("")} / 보너스 ${d.bonusDigits.join("")}`),
    "",
    `JSON만: {"games":[{"group":1,"digits":[0,1,2,3,4,5],"reasons":["한글 근거 2개"]}]} 길이 ${count}`,
  ].join("\n");
}

function normalizeDigits(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  const digits = raw.map((value) => Number(value)).filter((n) => Number.isInteger(n) && n >= 0 && n <= 9);
  return digits.length === PENSION_DIGIT_LEN ? digits : null;
}

export async function generatePensionAiCombos(
  draws: PensionDraw[],
  count: number,
  apiKey: string,
): Promise<GeneratedPension[]> {
  const started = performance.now();
  if (!apiKey.trim()) throw new Error("OpenAI API 키를 저장하세요.");
  const banned = new Set(draws.slice(-40).map((d) => ticketKey(d.group, d.digits)));
  const parsed = await completeJson(
    apiKey,
    "당신은 한국 연금복권720+ 통계 검토 보조다. 조 1–5와 6자리(0–9)를 제안한다. 각 회차는 독립이고 모든 조합의 1등 확률은 같다. JSON만 답한다.",
    buildPensionBrief(draws, count, [...banned]),
  );
  const games = (parsed as { games?: unknown }).games;
  if (!Array.isArray(games)) throw new Error("GPT가 조합 목록을 보내지 않았습니다. 다시 시도하세요.");

  const results: GeneratedPension[] = [];
  for (const game of games) {
    if (results.length >= count) break;
    const row = game as { group?: unknown; digits?: unknown; reasons?: unknown };
    const group = Number(row.group);
    const digits = normalizeDigits(row.digits);
    if (!Number.isInteger(group) || group < 1 || group > PENSION_GROUPS || !digits) continue;
    const key = ticketKey(group, digits);
    if (banned.has(key)) continue;
    banned.add(key);
    const reasons = Array.isArray(row.reasons)
      ? row.reasons.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
      : [];
    const analysis = analyze(group, digits, "ai");
    results.push({
      id: uid(),
      group,
      digits,
      strategy: "ai",
      createdAt: new Date().toISOString(),
      elapsedMs: 0,
      analysis: { ...analysis, appliedCriteria: [...analysis.appliedCriteria, ...reasons] },
    });
  }

  if (results.length < count) {
    const fill = generatePensionCombos(draws, "balanced", count - results.length);
    for (const item of fill) {
      results.push({
        ...item,
        strategy: "ai",
        analysis: {
          ...item.analysis,
          appliedCriteria: ["GPT 조합이 부족해 균형 기준으로 보충했습니다.", ...item.analysis.appliedCriteria],
        },
      });
    }
  }

  const elapsed = Math.max(1, Math.round(performance.now() - started));
  return results.slice(0, count).map((item) => ({ ...item, elapsedMs: elapsed }));
}
