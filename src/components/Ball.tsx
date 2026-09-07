import { ballColor, ballInk } from "../lib/constants";

interface Props {
  n: number;
  size?: "md" | "sm";
  state?: "plain" | "hit" | "miss";
}

export function Ball({ n, size = "md", state = "plain" }: Props) {
  return (
    <span
      className={`ball ${size === "sm" ? "sm" : ""} ${state === "hit" ? "hit" : ""} ${state === "miss" ? "miss" : ""}`}
      style={{ background: ballColor(n), color: ballInk(n) }}
    >
      {n}
    </span>
  );
}

export function BallRow({
  numbers,
  bonus,
  hits,
}: {
  numbers: number[];
  bonus?: number;
  hits?: number[];
}) {
  const hitSet = hits ? new Set(hits) : null;
  return (
    <div className="balls">
      {numbers.map((n) => (
        <Ball key={n} n={n} state={hitSet ? (hitSet.has(n) ? "hit" : "miss") : "plain"} />
      ))}
      {bonus != null && (
        <>
          <span className="plus">+</span>
          <Ball n={bonus} />
        </>
      )}
    </div>
  );
}
