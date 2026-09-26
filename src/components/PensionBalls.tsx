import { PENSION_DIGIT_COLORS } from "../lib/constants";

export function PensionRow({
  group,
  digits,
  bonus,
  hitsFromRight = 0,
  showGroup = true,
}: {
  group?: number;
  digits: number[];
  bonus?: number[];
  hitsFromRight?: number;
  showGroup?: boolean;
}) {
  return (
    <div className="balls pension-balls">
      {showGroup && group != null && <span className="digit-ball group">{group}조</span>}
      {digits.map((n, i) => {
        const hit = hitsFromRight > 0 && i >= digits.length - hitsFromRight;
        const miss = hitsFromRight > 0 && !hit;
        return (
          <span
            key={`${i}-${n}`}
            className={`digit-ball ${hit ? "hit" : ""} ${miss ? "miss" : ""}`}
            style={{ background: PENSION_DIGIT_COLORS[i], color: i === 0 ? "#3a2d08" : "#0c1017" }}
          >
            {n}
          </span>
        );
      })}
      {bonus && (
        <>
          <span className="plus">+</span>
          {bonus.map((n, i) => (
            <span
              key={`b-${i}-${n}`}
              className="digit-ball"
              style={{ background: PENSION_DIGIT_COLORS[i], color: i === 0 ? "#3a2d08" : "#0c1017" }}
            >
              {n}
            </span>
          ))}
        </>
      )}
    </div>
  );
}
