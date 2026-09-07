import type { CombinationAnalysis, Draw, GeneratedCombo, Strategy } from "../types";
import { BALL_MAX, PICK_COUNT, RECENT_WINDOW, TYPICAL_SUM } from "./constants";
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
