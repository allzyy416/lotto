import type { PensionDraw } from "../types";
import { PENSION_DIGIT_LEN, PENSION_GROUPS, PENSION_RECENT_WINDOW } from "./constants";

export interface PensionProfiles {
  groupCounts: number[];
  recentGroupCounts: number[];
  posCounts: number[][];
  recentPosCounts: number[][];
}

export function pensionShape(digits: number[]) {
  const odd = digits.filter((n) => n % 2 === 1).length;
  let consecutivePairs = 0;
  for (let i = 1; i < digits.length; i += 1) {
    if (Math.abs(digits[i] - digits[i - 1]) === 1 || digits[i] === digits[i - 1]) consecutivePairs += 1;
  }
  return {
    oddEven: [odd, digits.length - odd] as [number, number],
    digitSum: digits.reduce((a, b) => a + b, 0),
    uniqueDigits: new Set(digits).size,
    consecutivePairs,
  };
}

export function pensionProfiles(draws: PensionDraw[], recentWindow = PENSION_RECENT_WINDOW): PensionProfiles {
  const groupCounts = Array.from({ length: PENSION_GROUPS }, () => 0);
  const recentGroupCounts = Array.from({ length: PENSION_GROUPS }, () => 0);
  const posCounts = Array.from({ length: PENSION_DIGIT_LEN }, () => Array.from({ length: 10 }, () => 0));
  const recentPosCounts = Array.from({ length: PENSION_DIGIT_LEN }, () => Array.from({ length: 10 }, () => 0));
  const recent = draws.slice(-recentWindow);

  for (const draw of draws) {
    groupCounts[draw.group - 1] += 1;
    draw.digits.forEach((digit, i) => {
      posCounts[i][digit] += 1;
    });
  }
  for (const draw of recent) {
    recentGroupCounts[draw.group - 1] += 1;
    draw.digits.forEach((digit, i) => {
      recentPosCounts[i][digit] += 1;
    });
  }
  return { groupCounts, recentGroupCounts, posCounts, recentPosCounts };
}

export function topDigits(counts: number[], limit = 3): { digit: number; count: number }[] {
  return counts
    .map((count, digit) => ({ digit, count }))
    .sort((a, b) => b.count - a.count || a.digit - b.digit)
    .slice(0, limit);
}
