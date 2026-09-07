import { useMemo, useState } from "react";
import { BallRow } from "../components/Ball";
import { RANK_LABEL } from "../lib/constants";
import { useApp } from "../lib/context";
import { compareCombo } from "../lib/compare";
import { formatDate } from "../lib/format";
import { latestDraw } from "../lib/stats";
import { STRATEGIES } from "../types";

type Filter = "all" | "pending" | "hit" | "miss";

export function SavedPage() {
  const { saved, draws, removeSaved, setView } = useApp();
  const latest = latestDraw(draws);
  const [compareNo, setCompareNo] = useState(latest.drawNo);
  const [filter, setFilter] = useState<Filter>("all");
  const compareDraw = draws.find((d) => d.drawNo === compareNo) ?? latest;

  const rows = useMemo(() => {
    return saved.map((item) => {
      const target = draws.find((d) => d.drawNo === item.targetDrawNo);
      const drawn = Boolean(target);
      const official = target
        ? compareCombo(item.numbers, target)
        : compareCombo(item.numbers, compareDraw);
      return { item, drawn, official, target };
    });
  }, [saved, draws, compareDraw]);

  const visible = rows.filter((row) => {
    if (filter === "pending") return !row.drawn;
    if (filter === "hit") return row.drawn && (row.official.rank ?? 0) > 0;
    if (filter === "miss") return row.drawn && row.official.rank === 0;
    return true;
  });

  const comparedRate = saved.length
    ? Math.round((rows.filter((r) => r.drawn).length / saved.length) * 100)
    : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Saved · Compare</div>
          <h2>저장 번호와 당첨 비교</h2>
          <p>
            추첨이 끝난 회차는 자동으로 일치 개수와 등수를 계산합니다. 아직 추첨 전인 번호는 아래에서 다른 회차와
            대조해 볼 수 있습니다.
          </p>
        </div>
        <button className="btn primary" onClick={() => setView("generate")}>
          새 조합 만들기
        </button>
      </div>

      <div className="grid grid-3">
        <section className="card">
          <p className="stat">
            <b>{saved.length}</b>
            저장된 조합
          </p>
        </section>
        <section className="card">
          <p className="stat">
            <b>{comparedRate}%</b>
            당첨 결과 비교 이용
          </p>
        </section>
        <section className="card">
          <div className="field">
            <span>임의 회차와 대조</span>
            <select value={compareNo} onChange={(e) => setCompareNo(Number(e.target.value))}>
              {[...draws].reverse().slice(0, 40).map((draw) => (
                <option key={draw.drawNo} value={draw.drawNo}>
                  {draw.drawNo}회 · {formatDate(draw.date)}
                </option>
              ))}
            </select>
          </div>
        </section>
      </div>

      <div className="btn-row" style={{ margin: "16px 0" }}>
        {(
          [
            ["all", "전체"],
            ["pending", "미추첨"],
            ["hit", "등수"],
            ["miss", "낙첨"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={`btn ${filter === id ? "primary" : ""}`} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card empty">저장한 조합이 없습니다. 생성 화면에서 검토한 뒤 필요한 게임만 담아 두세요.</div>
      ) : (
        <div className="grid">
          {visible.map(({ item, drawn, official, target }) => {
            const preview = drawn ? official : compareCombo(item.numbers, compareDraw);
            const used = drawn ? target! : compareDraw;
            return (
              <article key={item.id} className="card combo">
                <div className="combo-top">
                  <div>
                    <div className="kicker">
                      대상 {item.targetDrawNo}회 · {STRATEGIES.find((s) => s.id === item.strategy)?.label}
                    </div>
                    <BallRow numbers={item.numbers} hits={preview.matched} />
                  </div>
                  <button className="btn danger" onClick={() => removeSaved(item.id)}>
                    삭제
                  </button>
                </div>
                <div className="kv">
                  <span>
                    비교 {used.drawNo}회 <b>{formatDate(used.date)}</b>
                  </span>
                  <span>
                    일치 <b>{preview.matches}개</b>
                  </span>
                  <span>
                    보너스 <b>{preview.bonusHit ? "포함" : "없음"}</b>
                  </span>
                  <span className={`rank-${preview.rank}`}>
                    {drawn ? "결과" : "미리보기"} <b>{RANK_LABEL[preview.rank]}</b>
                  </span>
                </div>
                {!drawn && (
                  <p style={{ margin: 0, color: "var(--dim)", fontSize: 12 }}>
                    {item.targetDrawNo}회는 아직 결과가 없습니다. 위 미리보기는 선택한 {compareDraw.drawNo}회와의
                    대조입니다.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
