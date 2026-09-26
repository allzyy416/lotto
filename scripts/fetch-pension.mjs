import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = "https://www.dhlottery.co.kr/pt720/selectPstPt720WnList.do";
const out = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/pension-draws.json");

function ymd(value) {
  const text = String(value);
  if (!/^\d{8}$/.test(text)) return text;
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function digits(value) {
  return String(value)
    .padStart(6, "0")
    .slice(-6)
    .split("")
    .map((n) => Number(n));
}

const res = await fetch(SRC, {
  headers: { Accept: "application/json", "User-Agent": "ALLZYY-LOTTO" },
});
if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
const payload = await res.json();
const rows = payload?.data?.result;
if (!Array.isArray(rows) || rows.length === 0) throw new Error("empty pension results");

const draws = rows
  .map((row) => ({
    drawNo: Number(row.psltEpsd),
    date: ymd(row.psltRflYmd),
    group: Number(row.wnBndNo),
    digits: digits(row.wnRnkVl),
    bonusDigits: digits(row.bnsRnkVl),
  }))
  .filter((row) => row.drawNo > 0 && row.group >= 1 && row.group <= 5 && row.digits.length === 6)
  .sort((a, b) => a.drawNo - b.drawNo);

writeFileSync(out, JSON.stringify(draws));
console.log(`wrote ${draws.length} pension draws → ${out}`);
