import { RANK_LABEL } from "./constants";
import type { Draw } from "../types";

export interface CompareResult {
  matches: number;
  matched: number[];
  missed: number[];
  bonusHit: boolean;
  rank: number;
  rankLabel: string;
}

export function compareCombo(numbers: number[], draw: Draw): CompareResult {
  const winning = new Set(draw.numbers);
  const matched = numbers.filter((n) => winning.has(n));
  const missed = numbers.filter((n) => !winning.has(n));
  const matches = matched.length;
  const bonusHit = numbers.includes(draw.bonus);

  let rank = 0;
  if (matches === 6) rank = 1;
  else if (matches === 5 && bonusHit) rank = 2;
  else if (matches === 5) rank = 3;
  else if (matches === 4) rank = 4;
  else if (matches === 3) rank = 5;

  return {
    matches,
    matched,
    missed,
    bonusHit,
    rank,
    rankLabel: RANK_LABEL[rank],
  };
}
