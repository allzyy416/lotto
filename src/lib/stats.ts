import type { Draw, NumberProfile, NumberTag } from "../types";
import { BALL_MAX, BANDS, LOW_MAX, RECENT_WINDOW, TYPICAL_SUM } from "./constants";

export interface FrequencyMap {
  counts: number[];
  ranks: number[];
}

export interface DistributionSnapshot {
  oddEven: Record<string, number>;
  lowHigh: Record<string, number>;
  bands: number[];
  sums: number[];
  consecutive: Record<number, number>;
  avgOdd: number;
  avgLow: number;
  avgSum: number;
}

function rankFromCounts(counts: number[]): number[] {
  const order = counts
    .map((count, i) => ({ n: i + 1, count }))
    .sort((a, b) => b.count - a.count || a.n - b.n);
  const ranks = Array.from({ length: counts.length }, () => 0);
  order.forEach((item, idx) => {
    ranks[item.n - 1] = idx + 1;
  });
  return ranks;
}

export function frequency(draws: Draw[]): FrequencyMap {
  const counts = Array.from({ length: BALL_MAX }, () => 0);
  for (const draw of draws) {
    for (const n of draw.numbers) counts[n - 1] += 1;
  }
  return { counts, ranks: rankFromCounts(counts) };
}

export function lastSeenAgo(draws: Draw[]): number[] {
  const ago = Array.from({ length: BALL_MAX }, () => draws.length);
  for (let i = draws.length - 1; i >= 0; i -= 1) {
    const distance = draws.length - i;
    for (const n of draws[i].numbers) {
      if (ago[n - 1] === draws.length) ago[n - 1] = distance;
    }
  }
  return ago;
}

export function numberProfiles(draws: Draw[], recentWindow = RECENT_WINDOW): NumberProfile[] {
  const all = frequency(draws);
  const recentDraws = draws.slice(-recentWindow);
  const recent = frequency(recentDraws);
  const ago = lastSeenAgo(draws);

  return Array.from({ length: BALL_MAX }, (_, i) => {
    const n = i + 1;
    const recentCount = recent.counts[i];
    const last = ago[i];
    let tag: NumberTag = "neutral";
    if (recentCount >= 4 || last <= 2) tag = "hot";
    else if (recentCount >= 2) tag = "warm";
    else if (last >= 12 || recentCount === 0) tag = "cold";
    return {
      n,
      frequencyCount: all.counts[i],
      frequencyRank: all.ranks[i],
      recentCount,
      recentRank: recent.ranks[i],
      lastSeenAgo: last,
      tag,
    };
  });
}

export function isOdd(n: number): boolean {
  return n % 2 === 1;
}

export function isLow(n: number): boolean {
  return n <= LOW_MAX;
}

export function bandIndex(n: number): number {
  return BANDS.findIndex((b) => n >= b.min && n <= b.max);
}

export function comboShape(numbers: number[]) {
  const odd = numbers.filter(isOdd).length;
  const low = numbers.filter(isLow).length;
  const bands = Array.from({ length: BANDS.length }, () => 0);
  for (const n of numbers) bands[bandIndex(n)] += 1;
  const sum = numbers.reduce((a, b) => a + b, 0);
  let consecutivePairs = 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === sorted[i - 1] + 1) consecutivePairs += 1;
  }
  return {
    oddEven: [odd, numbers.length - odd] as [number, number],
    lowHigh: [low, numbers.length - low] as [number, number],
    bands,
    sum,
    consecutivePairs,
  };
}

export function distribution(draws: Draw[]): DistributionSnapshot {
  const oddEven: Record<string, number> = {};
  const lowHigh: Record<string, number> = {};
  const consecutive: Record<number, number> = {};
  const bands = Array.from({ length: BANDS.length }, () => 0);
  const sums: number[] = [];
  let oddTotal = 0;
  let lowTotal = 0;

  for (const draw of draws) {
    const shape = comboShape(draw.numbers);
    const oe = `${shape.oddEven[0]}:${shape.oddEven[1]}`;
    const lh = `${shape.lowHigh[0]}:${shape.lowHigh[1]}`;
    oddEven[oe] = (oddEven[oe] ?? 0) + 1;
    lowHigh[lh] = (lowHigh[lh] ?? 0) + 1;
    consecutive[shape.consecutivePairs] = (consecutive[shape.consecutivePairs] ?? 0) + 1;
    shape.bands.forEach((v, i) => {
      bands[i] += v;
    });
    sums.push(shape.sum);
    oddTotal += shape.oddEven[0];
    lowTotal += shape.lowHigh[0];
  }

  return {
    oddEven,
    lowHigh,
    bands,
    sums,
    consecutive,
    avgOdd: oddTotal / draws.length,
    avgLow: lowTotal / draws.length,
    avgSum: sums.reduce((a, b) => a + b, 0) / draws.length,
  };
}

export function typicalOddEvenKeys(): string[] {
  return ["3:3", "4:2", "2:4"];
}

export function isTypicalSum(sum: number): boolean {
  return sum >= TYPICAL_SUM[0] && sum <= TYPICAL_SUM[1];
}

export function bandSpreadCount(bands: number[]): number {
  return bands.filter((v) => v > 0).length;
}

export function topEntries(map: Record<string, number>, limit = 5): [string, number][] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function maxCount(values: number[]): number {
  return Math.max(...values, 1);
}

export function latestDraw(draws: Draw[]): Draw {
  return draws[draws.length - 1];
}
