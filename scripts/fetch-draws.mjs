import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/draws.json");
const res = await fetch("https://smok95.github.io/lotto/results/all.json");
if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
const all = await res.json();
const draws = all.map((d) => ({
  drawNo: d.draw_no,
  date: String(d.date).slice(0, 10),
  numbers: d.numbers,
  bonus: d.bonus_no,
  firstPrize: d.divisions?.[0]?.prize ?? 0,
  firstWinners: d.divisions?.[0]?.winners ?? 0,
  sales: d.total_sales_amount ?? 0,
}));
writeFileSync(out, JSON.stringify(draws));
console.log(`wrote ${draws.length} draws → ${out}`);
