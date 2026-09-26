import { PENSION_RANK_LABEL } from "./constants";
import type { PensionDraw } from "../types";

export interface PensionCompareResult {
  suffixHits: number;
  groupHit: boolean;
  bonusHit: boolean;
  rank: number;
  rankLabel: string;
}

export function comparePension(group: number, digits: number[], draw: PensionDraw): PensionCompareResult {
  let suffixHits = 0;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    if (digits[i] !== draw.digits[i]) break;
    suffixHits += 1;
  }
  const groupHit = group === draw.group;
  const bonusHit = digits.join("") === draw.bonusDigits.join("");

  let rank = 0;
  if (suffixHits === 6 && groupHit) rank = 1;
  else if (suffixHits === 6) rank = 2;
  else if (suffixHits === 5) rank = 3;
  else if (suffixHits === 4) rank = 4;
  else if (suffixHits === 3) rank = 5;
  else if (suffixHits === 2) rank = 6;
  else if (suffixHits === 1) rank = 7;
  else if (bonusHit) rank = 8;

  return {
    suffixHits,
    groupHit,
    bonusHit,
    rank,
    rankLabel: PENSION_RANK_LABEL[rank],
  };
}
