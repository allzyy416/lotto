import { useMemo, useState } from "react";
import { PensionRow } from "../components/PensionBalls";
import { PENSION_RANK_LABEL } from "../lib/constants";
import { useApp } from "../lib/context";
import { formatDate } from "../lib/format";
import { comparePension } from "../lib/pensionCompare";
import { latestPension } from "../lib/pensionData";
import { STRATEGIES } from "../types";

type Filter = "all" | "pending" | "hit" | "miss" | "bought";

export function PensionSavedPage() {
  const { savedPension, pensionDraws, removeSavedPension, togglePensionPurchased, setView } = useApp();
  const latest = latestPension(pensionDraws);
  const [compareNo, setCompareNo] = useState(latest.drawNo);
  const [filter, setFilter] = useState<Filter>("all");
  const compareDraw = pensionDraws.find((d) => d.drawNo === compareNo) ?? latest;

  const rows = useMemo(() => {
    return savedPension.map((item) => {
      const target = pensionDraws.find((d) => d.drawNo === item.targetDrawNo);
      const drawn = Boolean(target);
      const official = target
        ? comparePension(item.group, item.digits, target)
        : comparePension(item.group, item.digits, compareDraw);
      return { item, drawn, official, target };
    });
  }, [savedPension, pensionDraws, compareDraw]);

  const visible = rows.filter((row) => {
    if (filter === "pending") return !row.drawn;
    if (filter === "bought") return Boolean(row.item.purchased);
    if (filter === "hit") return row.drawn && (row.official.rank ?? 0) > 0;
    if (filter === "miss") return row.drawn && row.official.rank === 0;
    return true;
  });

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Saved · 720+</div>
          <h2>연금복권 저장과 비교</h2>
          <p>
            구매한 번호는 구매로 표시해 두세요. 해당 회차가 반영되면 끝자리 일치와 등수가 바로 보입니다.
          </p>
        </div>
        <button className="btn primary btn-wide" onClick={() => setView("generate")}>
          새 번호 만들기
        </button>
      </div>

      <div className="grid grid-4">
        <section className="card">
          <p className="stat">
            <b>{savedPension.length}</b>
            저장된 번호
          </p>
        </section>
        <section className="card">
          <p className="stat">
            <b>{savedPension.filter((item) => item.purchased).length}</b>
            구매로 표시
          </p>
        </section>
        <section className="card">
          <p className="stat">
            <b>{rows.filter((row) => row.drawn).length}</b>
            결과 비교
          </p>
        </section>
        <section className="card">
          <div className="field">
            <span>임의 회차와 대조</span>
            <select value={compareNo} onChange={(e) => setCompareNo(Number(e.target.value))}>
              {[...pensionDraws].reverse().slice(0, 40).map((draw) => (
                <option key={draw.drawNo} value={draw.drawNo}>
                  {draw.drawNo}회 · {formatDate(draw.date)}
                </option>
              ))}
            </select>
          </div>
        </section>
      </div>

      <div className="btn-row filter-row" style={{ margin: "16px 0" }}>
        {(
          [
            ["all", "전체"],
            ["bought", "구매"],
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
        <div className="card empty">저장한 연금복권 번호가 없습니다. 생성 화면에서 검토한 뒤 담아 두세요.</div>
      ) : (
        <div className="grid">
          {visible.map(({ item, drawn, official, target }) => {
            const used = drawn ? target! : compareDraw;
            return (
              <article key={item.id} className="card combo">
                <div className="combo-top">
                  <div>
                    <div className="kicker">
                      대상 {item.targetDrawNo}회 · {STRATEGIES.find((s) => s.id === item.strategy)?.label}
                      {item.purchased ? " · 구매" : ""}
                    </div>
                    <PensionRow group={item.group} digits={item.digits} hitsFromRight={official.suffixHits} />
                  </div>
                  <div className="btn-row">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={Boolean(item.purchased)}
                        onChange={(e) => togglePensionPurchased(item.id, e.target.checked)}
                      />
                      구매함
                    </label>
                    <button className="btn danger" onClick={() => removeSavedPension(item.id)}>
                      삭제
                    </button>
                  </div>
                </div>
                <div className="kv">
                  <span>
                    비교 {used.drawNo}회 <b>{formatDate(used.date)}</b>
                  </span>
                  <span>
                    끝자리 <b>{official.suffixHits}개</b>
                  </span>
                  <span>
                    조 <b>{official.groupHit ? "일치" : "다름"}</b>
                  </span>
                  <span>
                    보너스 <b>{official.bonusHit ? "일치" : "없음"}</b>
                  </span>
                  <span className={`rank-${Math.min(official.rank, 5)}`}>
                    {drawn ? "결과" : "미리보기"} <b>{PENSION_RANK_LABEL[official.rank]}</b>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
