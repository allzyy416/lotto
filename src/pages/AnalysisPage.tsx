import { useMemo, useState } from "react";
import { Ball } from "../components/Ball";
import { BANDS, RECENT_WINDOW } from "../lib/constants";
import { useApp } from "../lib/context";
import { formatDate } from "../lib/format";
import { distribution, frequency, maxCount, numberProfiles, topEntries } from "../lib/stats";

export function AnalysisPage() {
  const { draws } = useApp();
  const [recentOnly, setRecentOnly] = useState(false);
  const scope = recentOnly ? draws.slice(-RECENT_WINDOW) : draws;
  const allFreq = useMemo(() => frequency(draws), [draws]);
  const recentFreq = useMemo(() => frequency(draws.slice(-RECENT_WINDOW)), [draws]);
  const profiles = useMemo(() => numberProfiles(draws), [draws]);
  const dist = useMemo(() => distribution(scope), [scope]);
  const maxAll = maxCount(allFreq.counts);
  const maxRecent = maxCount(recentFreq.counts);

  const hot = [...profiles].sort((a, b) => b.recentCount - a.recentCount).slice(0, 8);
  const cold = [...profiles].sort((a, b) => b.lastSeenAgo - a.lastSeenAgo).slice(0, 8);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Analysis</div>
          <h2>출현 빈도와 최근 추세</h2>
          <p>
            같은 번호를 장기 빈도와 최근 20회로 나눠 봅니다. 한쪽에만 기대면 최근 흐름이나 누적 편향을 오해하기
            쉽습니다. 두 지표 모두 다음 회차를 맞히지 않습니다.
          </p>
        </div>
        <div className="btn-row">
          <button className={`btn ${!recentOnly ? "primary" : ""}`} onClick={() => setRecentOnly(false)}>
            전체 {draws.length}회
          </button>
          <button className={`btn ${recentOnly ? "primary" : ""}`} onClick={() => setRecentOnly(true)}>
            최근 {RECENT_WINDOW}회
          </button>
        </div>
      </div>

      <div className="grid grid-split">
        <section className="card">
          <div className="kicker">All-time frequency</div>
          <h3>전체 회차 출현 빈도</h3>
          <Heat counts={allFreq.counts} max={maxAll} color="var(--gold)" />
        </section>
        <section className="card">
          <div className="kicker">Recent trend</div>
          <h3>최근 {RECENT_WINDOW}회 출현</h3>
          <Heat counts={recentFreq.counts} max={maxRecent} color="var(--cold)" />
        </section>
      </div>

      <div className="grid grid-split" style={{ marginTop: 16 }}>
        <section className="card">
          <h3>최근 추세 · 핫 번호</h3>
          <NumberList items={hot} kind="hot" />
        </section>
        <section className="card">
          <h3>최근 공백 · 콜드 번호</h3>
          <NumberList items={cold} kind="cold" />
        </section>
      </div>

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <section className="card">
          <h3>홀수 · 짝수</h3>
          {topEntries(dist.oddEven).map(([key, count]) => (
            <Dist key={key} label={`${key.replace(":", " : ")}`} value={count} total={scope.length} />
          ))}
        </section>
        <section className="card">
          <h3>저번호 · 고번호</h3>
          <p style={{ color: "var(--dim)", fontSize: 12, marginTop: 0 }}>저번호는 1–22, 고번호는 23–45입니다.</p>
          {topEntries(dist.lowHigh).map(([key, count]) => (
            <Dist key={key} label={`${key.replace(":", " : ")}`} value={count} total={scope.length} />
          ))}
        </section>
        <section className="card">
          <h3>연속 번호 쌍</h3>
          {topEntries(dist.consecutive).map(([key, count]) => (
            <Dist key={key} label={`${key}쌍`} value={count} total={scope.length} />
          ))}
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h3>번호 구간 분포</h3>
        {BANDS.map((band, i) => (
          <Dist key={band.label} label={band.label} value={dist.bands[i]} total={dist.bands.reduce((a, b) => a + b, 0)} />
        ))}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h3>최근 흐름</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>회차</th>
                <th>날짜</th>
                <th>번호</th>
                <th>홀짝</th>
                <th>저고</th>
                <th>합계</th>
              </tr>
            </thead>
            <tbody>
              {[...draws].reverse().slice(0, 12).map((draw) => {
                const odd = draw.numbers.filter((n) => n % 2 === 1).length;
                const low = draw.numbers.filter((n) => n <= 22).length;
                const sum = draw.numbers.reduce((a, b) => a + b, 0);
                return (
                  <tr key={draw.drawNo}>
                    <td className="mono">{draw.drawNo}</td>
                    <td>{formatDate(draw.date)}</td>
                    <td className="mono">{draw.numbers.join("  ")}</td>
                    <td>
                      {odd}:{6 - odd}
                    </td>
                    <td>
                      {low}:{6 - low}
                    </td>
                    <td className="mono">{sum}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Heat({ counts, max, color }: { counts: number[]; max: number; color: string }) {
  return (
    <div className="heat">
      {counts.map((count, i) => {
        const ratio = count / max;
        return (
          <div key={i} className="heat-cell">
            <b>{i + 1}</b>
            <span>{count}</span>
            <div className="bar">
              <i style={{ width: `${Math.max(8, ratio * 100)}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Dist({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="dist-row">
      <span style={{ width: 72 }}>{label}</span>
      <div className="dist-track">
        <i style={{ width: `${pct}%` }} />
      </div>
      <span className="mono" style={{ width: 72, textAlign: "right" }}>
        {value} · {pct}%
      </span>
    </div>
  );
}

function NumberList({
  items,
  kind,
}: {
  items: { n: number; recentCount: number; frequencyCount: number; lastSeenAgo: number }[];
  kind: "hot" | "cold";
}) {
  return (
    <div className="grid" style={{ gap: 10 }}>
      {items.map((item) => (
        <div key={item.n} className="kv" style={{ alignItems: "center" }}>
          <Ball n={item.n} size="sm" />
          {kind === "hot" ? (
            <span>
              최근 {item.recentCount}회 출현 · 누적 {item.frequencyCount}회
            </span>
          ) : (
            <span>
              {item.lastSeenAgo}회 전 마지막 출현 · 누적 {item.frequencyCount}회
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
