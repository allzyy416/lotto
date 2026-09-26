import { useMemo, useState } from "react";
import { PENSION_POS_LABEL, PENSION_RECENT_WINDOW } from "../lib/constants";
import { useApp } from "../lib/context";
import { formatDate } from "../lib/format";
import { maxCount } from "../lib/stats";
import { pensionProfiles } from "../lib/pensionStats";

export function PensionAnalysisPage() {
  const { pensionDraws } = useApp();
  const [recentOnly, setRecentOnly] = useState(false);
  const profiles = useMemo(() => pensionProfiles(pensionDraws), [pensionDraws]);
  const groups = recentOnly ? profiles.recentGroupCounts : profiles.groupCounts;
  const positions = recentOnly ? profiles.recentPosCounts : profiles.posCounts;
  const periodLabel = recentOnly ? `최근 ${PENSION_RECENT_WINDOW}회` : `전체 ${pensionDraws.length}회`;
  const history = [...pensionDraws].reverse().slice(0, recentOnly ? PENSION_RECENT_WINDOW : 12);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Pension analysis</div>
          <h2>조와 자리별 출현</h2>
          <p>
            연금복권은 번호 조합이 아니라 조와 여섯 자리입니다. 막대는 그 기간에서 가장 많이 나온 값 대비
            비율입니다. 다음 회차를 맞히지 않습니다.
          </p>
        </div>
        <div className="btn-row page-actions">
          <button className={`btn ${!recentOnly ? "primary" : ""}`} onClick={() => setRecentOnly(false)}>
            전체 {pensionDraws.length}회
          </button>
          <button className={`btn ${recentOnly ? "primary" : ""}`} onClick={() => setRecentOnly(true)}>
            최근 {PENSION_RECENT_WINDOW}회
          </button>
        </div>
      </div>

      <section className="card">
        <h3>{periodLabel} 조 출현</h3>
        <div className="heat" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
          {groups.map((count, i) => {
            const ratio = count / maxCount(groups);
            return (
              <div key={i} className="heat-cell">
                <b>{i + 1}조</b>
                <span>{count}</span>
                <div className="bar">
                  <i style={{ width: `${Math.max(8, ratio * 100)}%`, background: "var(--gold)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        {positions.map((counts, pos) => (
          <section key={pos} className="card">
            <h3>
              {PENSION_POS_LABEL[pos]}자리 · {periodLabel}
            </h3>
            <div className="heat">
              {counts.map((count, digit) => {
                const ratio = count / maxCount(counts);
                return (
                  <div key={digit} className="heat-cell">
                    <b>{digit}</b>
                    <span>{count}</span>
                    <div className="bar">
                      <i
                        style={{
                          width: `${Math.max(8, ratio * 100)}%`,
                          background: recentOnly ? "var(--cold)" : "var(--gold)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h3>{recentOnly ? `최근 ${PENSION_RECENT_WINDOW}회` : "최근 흐름"}</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>회차</th>
                <th className="hide-sm">날짜</th>
                <th>1등</th>
                <th>보너스</th>
              </tr>
            </thead>
            <tbody>
              {history.map((draw) => (
                <tr key={draw.drawNo}>
                  <td className="mono">{draw.drawNo}</td>
                  <td className="hide-sm">{formatDate(draw.date)}</td>
                  <td className="mono nowrap">
                    {draw.group}조 {draw.digits.join(" ")}
                  </td>
                  <td className="mono nowrap">{draw.bonusDigits.join(" ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
