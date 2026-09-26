import type { CombinationAnalysis, Draw, GeneratedCombo, Strategy } from "../types";
import { buildAiBrief } from "./aiBrief";
import { BALL_MAX, PICK_COUNT, RECENT_WINDOW, TYPICAL_SUM } from "./constants";
import { completeJson } from "./openai";
import {
  bandSpreadCount,
  comboShape,
  isTypicalSum,
  numberProfiles,
  typicalOddEvenKeys,
} from "./stats";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function weightedPick(weights: number[], banned: Set<string>): number[] | null {
  const w = weights.slice();
  const picked: number[] = [];
  for (let i = 0; i < PICK_COUNT; i += 1) {
    const total = w.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    let chosen = -1;
    for (let j = 0; j < BALL_MAX; j += 1) {
      if (w[j] <= 0) continue;
      r -= w[j];
      if (r <= 0) {
        chosen = j;
        break;
      }
    }
    if (chosen < 0) return null;
    picked.push(chosen + 1);
    w[chosen] = 0;
  }
  const sorted = picked.sort((a, b) => a - b);
  if (banned.has(sorted.join(","))) return null;
  return sorted;
}

function baseWeights(strategy: Strategy, draws: Draw[]): number[] {
  const profiles = numberProfiles(draws, RECENT_WINDOW);
  return profiles.map((p) => {
    const freq = 0.35 + p.frequencyCount / Math.max(draws.length, 1);
    const hot = 0.25 + p.recentCount / RECENT_WINDOW;
    const coldBoost = p.lastSeenAgo >= 12 ? 1.15 : 1;
    if (strategy === "frequency") return freq * freq;
    if (strategy === "hot") return hot * hot;
    if (strategy === "mixed") {
      if (p.tag === "cold") return 0.85 * coldBoost;
      if (p.tag === "hot") return 1.25 * hot;
      return 0.7 + freq;
    }
    return 0.55 * freq + 0.45 * hot;
  });
}

function shapeOk(numbers: number[], strategy: Strategy): boolean {
  const shape = comboShape(numbers);
  const odd = shape.oddEven[0];
  const low = shape.lowHigh[0];
  const spread = bandSpreadCount(shape.bands);
  const sumOk = isTypicalSum(shape.sum);
  if (strategy === "balanced") {
    return odd >= 2 && odd <= 4 && low >= 2 && low <= 4 && spread >= 3 && sumOk && shape.consecutivePairs <= 2;
  }
  if (strategy === "mixed") {
    return odd >= 2 && odd <= 4 && low >= 2 && low <= 4 && spread >= 3 && shape.consecutivePairs <= 2;
  }
  return spread >= 2 && shape.consecutivePairs <= 3 && shape.sum >= 80 && shape.sum <= 190;
}

function analyze(numbers: number[], draws: Draw[], strategy: Strategy): CombinationAnalysis {
  const profiles = numberProfiles(draws).filter((p) => numbers.includes(p.n));
  const shape = comboShape(numbers);
  const oeKey = `${shape.oddEven[0]}:${shape.oddEven[1]}`;
  const criteria: string[] = [];

  if (strategy === "balanced") {
    criteria.push("홀짝 2–4개, 저번호 2–4개로 과거 전형 구간에 맞춤");
    criteria.push(`합계 ${TYPICAL_SUM[0]}–${TYPICAL_SUM[1]} 구간 유지`);
    criteria.push("번호 구간 3개 이상에 분산");
    criteria.push("연속 번호 쌍은 최대 2개");
    criteria.push("전체 빈도와 최근 20회 추세를 약하게 가중");
  } else if (strategy === "hot") {
    criteria.push("최근 20회 출현 횟수에 가중 표본 추출");
    criteria.push("구간이 한곳에 몰리지 않도록 최소 2개 구간 사용");
  } else if (strategy === "frequency") {
    criteria.push("1회부터 최신 회차까지 출현 빈도에 가중 표본 추출");
    criteria.push("극단적인 합계·연속 조합은 다시 추출");
  } else if (strategy === "ai") {
    criteria.push("GPT가 전체 빈도, 최근 20회 추세, 홀짝·저고·구간·합계 분포를 함께 검토");
    criteria.push("물리 추첨기 점검·마모의 공개 수치 오차는 없어, 한 회차나 한 구간에 과적합하지 않게 분산");
    criteria.push("모든 조합의 당첨 확률은 같습니다. 검토용 제안이며 예측이 아닙니다");
  } else {
    criteria.push("빈도 상위 · 최근 핫 · 공백이 긴 콜드 번호를 혼합");
    criteria.push("홀짝·저고 균형을 유지하고 구간을 3곳 이상에 분산");
  }

  return {
    ...shape,
    profiles: profiles.sort((a, b) => a.n - b.n),
    vsTypical: {
      oddEvenCommon: typicalOddEvenKeys().includes(oeKey),
      sumInTypical: isTypicalSum(shape.sum),
      bandSpread: bandSpreadCount(shape.bands) >= 3,
    },
    appliedCriteria: criteria,
  };
}

export function generateCombos(draws: Draw[], strategy: Strategy, count = 5): GeneratedCombo[] {
  if (strategy === "ai") {
    throw new Error("AI 추첨은 generateAiCombos를 사용하세요.");
  }
  const started = performance.now();
  const weights = baseWeights(strategy, draws);
  const banned = new Set(draws.slice(-80).map((d) => [...d.numbers].sort((a, b) => a - b).join(",")));
  const results: GeneratedCombo[] = [];

  let guard = 0;
  while (results.length < count && guard < 4000) {
    guard += 1;
    const numbers = weightedPick(weights, banned);
    if (!numbers || !shapeOk(numbers, strategy)) continue;
    const key = numbers.join(",");
    banned.add(key);
    results.push({
      id: uid(),
      numbers,
      strategy,
      createdAt: new Date().toISOString(),
      elapsedMs: 0,
      analysis: analyze(numbers, draws, strategy),
    });
  }

  const elapsed = Math.max(1, Math.round(performance.now() - started));
  return results.map((item) => ({ ...item, elapsedMs: elapsed }));
}

function normalizeAiNumbers(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  const nums = [
    ...new Set(
      raw
        .map((value) => Number(value))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= BALL_MAX),
    ),
  ].sort((a, b) => a - b);
  return nums.length === PICK_COUNT ? nums : null;
}

function readAiReasons(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 3);
}

export async function generateAiCombos(draws: Draw[], count = 5, apiKey: string): Promise<GeneratedCombo[]> {
  const started = performance.now();
  const key = apiKey.trim();
  if (!key) throw new Error("OpenAI API 키를 저장하세요.");

  const banned = new Set(draws.slice(-80).map((d) => [...d.numbers].sort((a, b) => a - b).join(",")));
  const parsed = await completeJson(
    key,
    "당신은 한국 로또 6/45 통계 검토 보조다. 각 회차는 독립이고 모든 조합의 당첨 확률은 같다. 통계와 물리 추첨의 일반 변동만 보고 검토용 조합을 제안하며, 예측·보장·당첨 확률 상승을 말하지 않는다. JSON만 답한다.",
    buildAiBrief(draws, count, [...banned]),
  );
  const games = (parsed as { games?: unknown }).games;
  if (!Array.isArray(games)) throw new Error("GPT가 조합 목록을 보내지 않았습니다. 다시 시도하세요.");

  const results: GeneratedCombo[] = [];
  for (const game of games) {
    if (results.length >= count) break;
    const row = game as { numbers?: unknown; reasons?: unknown };
    const numbers = normalizeAiNumbers(row.numbers);
    if (!numbers) continue;
    const setKey = numbers.join(",");
    if (banned.has(setKey)) continue;
    banned.add(setKey);
    const analysis = analyze(numbers, draws, "ai");
    results.push({
      id: uid(),
      numbers,
      strategy: "ai",
      createdAt: new Date().toISOString(),
      elapsedMs: 0,
      analysis: {
        ...analysis,
        appliedCriteria: [...analysis.appliedCriteria, ...readAiReasons(row.reasons)],
      },
    });
  }

  if (results.length < count) {
    const fill = generateCombos(draws, "balanced", count - results.length);
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
