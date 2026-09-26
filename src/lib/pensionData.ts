import bundled from "../data/pension-draws.json";
import type { PensionDraw } from "../types";
import { PENSION_DIGIT_LEN, PENSION_GROUPS, PENSION_LIST_URL } from "./constants";
import { loadExtraPensionDraws, saveExtraPensionDraws } from "./storage";

interface RemotePension {
  psltEpsd: number;
  psltRflYmd: string;
  wnBndNo: string | number;
  wnRnkVl: string;
  bnsRnkVl: string;
}

function ymd(value: string): string {
  const text = String(value);
  if (!/^\d{8}$/.test(text)) return text;
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function toDigits(value: string): number[] {
  return String(value)
    .padStart(PENSION_DIGIT_LEN, "0")
    .slice(-PENSION_DIGIT_LEN)
    .split("")
    .map((n) => Number(n));
}

export function toPensionDraw(row: RemotePension): PensionDraw {
  return {
    drawNo: Number(row.psltEpsd),
    date: ymd(String(row.psltRflYmd)),
    group: Number(row.wnBndNo),
    digits: toDigits(row.wnRnkVl),
    bonusDigits: toDigits(row.bnsRnkVl),
  };
}

function mergeDraws(base: PensionDraw[], extra: PensionDraw[]): PensionDraw[] {
  const map = new Map<number, PensionDraw>();
  for (const draw of [...base, ...extra]) map.set(draw.drawNo, draw);
  return [...map.values()].sort((a, b) => a.drawNo - b.drawNo);
}

export function validatePensionDraw(draw: PensionDraw): boolean {
  if (draw.group < 1 || draw.group > PENSION_GROUPS) return false;
  if (draw.digits.length !== PENSION_DIGIT_LEN || draw.bonusDigits.length !== PENSION_DIGIT_LEN) return false;
  return [...draw.digits, ...draw.bonusDigits].every((n) => Number.isInteger(n) && n >= 0 && n <= 9);
}

export function loadLocalPensionDraws(): PensionDraw[] {
  return mergeDraws(bundled as PensionDraw[], loadExtraPensionDraws()).filter(validatePensionDraw);
}

export async function refreshPensionDraws(
  current: PensionDraw[],
): Promise<{ draws: PensionDraw[]; added: number }> {
  const res = await fetch(PENSION_LIST_URL, { cache: "no-store", headers: { Accept: "application/json" } });
  const text = (await res.text()).trim();
  if (!text || text.startsWith("<")) {
    throw new Error("서버에 연금복권 연결이 없습니다. EC2에서 배포 명령을 실행한 뒤 다시 시도하세요.");
  }
  const payload = JSON.parse(text) as { data?: { result?: RemotePension[] } };
  const rows = payload.data?.result ?? [];
  const incoming = rows.map(toPensionDraw).filter(validatePensionDraw);
  if (incoming.length === 0) throw new Error("연금복권 회차 정보를 가져오지 못했습니다.");
  const have = new Set(current.map((d) => d.drawNo));
  const extra = incoming.filter((row) => !have.has(row.drawNo));
  const merged = mergeDraws(current, incoming);
  if (extra.length) saveExtraPensionDraws(extra);
  return { draws: merged, added: extra.length };
}

export function latestPension(draws: PensionDraw[]): PensionDraw {
  return draws[draws.length - 1];
}

export function formatPensionTicket(group: number, digits: number[]): string {
  return `${group}조 ${digits.join("")}`;
}
