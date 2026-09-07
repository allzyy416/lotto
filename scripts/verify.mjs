import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const draws = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/draws.json"), "utf8"));
const last = draws[draws.length - 1];
if (draws.length !== 1240) throw new Error(`expected 1240 draws, got ${draws.length}`);
if (last.drawNo !== 1240 || last.numbers.join(",") !== "11,13,19,20,31,44" || last.bonus !== 27) {
  throw new Error(`latest draw mismatch ${JSON.stringify(last)}`);
}
for (const draw of draws) {
  const set = new Set(draw.numbers);
  if (draw.numbers.length !== 6 || set.size !== 6) throw new Error(`bad numbers ${draw.drawNo}`);
  if (draw.numbers.some((n) => n < 1 || n > 45) || set.has(draw.bonus)) throw new Error(`bad range ${draw.drawNo}`);
}

function rank(numbers, draw) {
  const winning = new Set(draw.numbers);
  const matches = numbers.filter((n) => winning.has(n)).length;
  const bonusHit = numbers.includes(draw.bonus);
  if (matches === 6) return 1;
  if (matches === 5 && bonusHit) return 2;
  if (matches === 5) return 3;
  if (matches === 4) return 4;
  if (matches === 3) return 5;
  return 0;
}

if (rank([11, 13, 19, 20, 31, 44], last) !== 1) throw new Error("1st rank failed");
if (rank([11, 13, 19, 20, 31, 27], last) !== 2) throw new Error("2nd rank failed");
if (rank([11, 13, 19, 20, 31, 1], last) !== 3) throw new Error("3rd rank failed");
if (rank([11, 13, 19, 20, 1, 2], last) !== 4) throw new Error("4th rank failed");
if (rank([11, 13, 19, 1, 2, 3], last) !== 5) throw new Error("5th rank failed");
if (rank([1, 2, 3, 4, 5, 6], last) !== 0) throw new Error("miss rank failed");

console.log("data + compare checks passed", last.drawNo, last.date);
