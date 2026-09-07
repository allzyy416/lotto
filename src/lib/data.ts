import bundled from "../data/draws.json";
import type { Draw } from "../types";
import { DATA_LATEST_URL, DATA_ROUND_URL } from "./constants";
import { loadExtraDraws, saveExtraDraws } from "./storage";

interface RemoteDraw {
  draw_no: number;
  numbers: number[];
  bonus_no: number;
  date: string;
  divisions?: { prize?: number; winners?: number }[];
  total_sales_amount?: number;
}

function toDraw(row: RemoteDraw): Draw {
  return {
    drawNo: row.draw_no,
    date: String(row.date).slice(0, 10),
    numbers: row.numbers,
    bonus: row.bonus_no,
    firstPrize: row.divisions?.[0]?.prize ?? 0,
    firstWinners: row.divisions?.[0]?.winners ?? 0,
    sales: row.total_sales_amount ?? 0,
  };
}

function mergeDraws(base: Draw[], extra: Draw[]): Draw[] {
  const map = new Map<number, Draw>();
  for (const draw of [...base, ...extra]) map.set(draw.drawNo, draw);
  return [...map.values()].sort((a, b) => a.drawNo - b.drawNo);
}

export function loadLocalDraws(): Draw[] {
  return mergeDraws(bundled as Draw[], loadExtraDraws());
}

export async function refreshDraws(current: Draw[]): Promise<{ draws: Draw[]; added: number }> {
  const latestRes = await fetch(DATA_LATEST_URL, { cache: "no-store" });
  if (!latestRes.ok) throw new Error("최신 회차 정보를 가져오지 못했습니다.");
  const latest = toDraw((await latestRes.json()) as RemoteDraw);
  const have = new Set(current.map((d) => d.drawNo));
  const extra: Draw[] = [];

  if (!have.has(latest.drawNo)) extra.push(latest);

  const maxLocal = Math.max(...current.map((d) => d.drawNo), 0);
  for (let n = maxLocal + 1; n < latest.drawNo; n += 1) {
    const res = await fetch(DATA_ROUND_URL(n), { cache: "no-store" });
    if (!res.ok) continue;
    extra.push(toDraw((await res.json()) as RemoteDraw));
  }

  if (extra.length === 0) {
    const next = mergeDraws(current, [latest]);
    return { draws: next, added: 0 };
  }

  const merged = mergeDraws(current, extra);
  saveExtraDraws(extra);
  return { draws: merged, added: extra.length };
}

export function validateDraw(draw: Draw): boolean {
  if (draw.numbers.length !== 6) return false;
  const unique = new Set(draw.numbers);
  if (unique.size !== 6) return false;
  if (draw.numbers.some((n) => n < 1 || n > 45)) return false;
  if (draw.bonus < 1 || draw.bonus > 45 || unique.has(draw.bonus)) return false;
  return true;
}
