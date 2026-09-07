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
  const scopeFreq = recentOnly ? recentFreq : allFreq;
  const compareFreq = recentOnly ? allFreq : recentFreq;
  const profiles = useMemo(() => numberProfiles(draws), [draws]);
  const dist = useMemo(() => distribution(scope), [scope]);
  const periodLabel = recentOnly ? `최근 ${RECENT_WINDOW}회` : `전체 ${draws.length}회`;

  const hot = recentOnly
    ? [...profiles].sort((a, b) => b.recentCount - a.recentCount || a.lastSeenAgo - b.lastSeenAgo).slice(0, 8)
    : [...profiles].sort((a, b) => b.frequencyCount - a.frequencyCount || a.n - b.n).slice(0, 8);
  const cold = recentOnly
    ? [...profiles].sort((a, b) => b.lastSeenAgo - a.lastSeenAgo || a.recentCount - b.recentCount).slice(0, 8)
    : [...profiles].sort((a, b) => a.frequencyCount - b.frequencyCount || a.n - b.n).slice(0, 8);

  const history = recentOnly ? [...scope].reverse() : [...draws].reverse().slice(0, 12);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Analysis</div>
          <h2>출현 빈도와 최근 추세</h2>
          <p>
            위를 눌러 기준 기간을 바꿉니다. 출현 횟수 격자, 핫·콜드 번호, 홀짝·저고·구간 분포가 선택한 기간으로
            다시 계산됩니다. 두 지표 모두 다음 회차를 맞히지 않습니다.
          </p>
        </div>
        <div className="btn-row page-actions">
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
          <div className="kicker">{recentOnly ? "Recent trend" : "All-time frequency"}</div>
          <h3>
            {periodLabel} 출현 {recentOnly ? "" : "빈도"}
          </h3>
          <Heat
            counts={scopeFreq.counts}
            max={maxCount(scopeFreq.counts)}
            color={recentOnly ? "var(--cold)" : "var(--gold)"}
          />
        </section>
        <section className="card">
          <div className="kicker">Compare</div>
          <h3>{recentOnly ? `같은 번호의 전체 ${draws.length}회 빈도` : `같은 번호의 최근 ${RECENT_WINDOW}회`}</h3>
          <Heat
            counts={compareFreq.counts}
            max={maxCount(compareFreq.counts)}
            color={recentOnly ? "var(--gold)" : "var(--cold)"}
          />
        </section>
      </div>

      <div className="grid grid-split" style={{ marginTop: 16 }}>
        <section className="card">
          <h3>{recentOnly ? "최근 추세 · 핫 번호" : "전체 빈도 · 상위 번호"}</h3>
          <NumberList items={hot} kind="hot" recentOnly={recentOnly} />
        </section>
        <section className="card">
          <h3>{recentOnly ? "최근 공백 · 콜드 번호" : "전체 빈도 · 하위 번호"}</h3>
          <NumberList items={cold} kind="cold" recentOnly={recentOnly} />
        </section>
      </div>

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <section className="card">
          <h3>홀수 · 짝수</h3>
          <p style={{ color: "var(--dim)", fontSize: 12, marginTop: 0 }}>기준 {periodLabel}</p>
          {topEntries(dist.oddEven).map(([key, count]) => (
            <Dist key={key} label={`${key.replace(":", " : ")}`} value={count} total={scope.length} />
          ))}
        </section>
        <section className="card">
          <h3>저번호 · 고번호</h3>
          <p style={{ color: "var(--dim)", fontSize: 12, marginTop: 0 }}>
            기준 {periodLabel} · 저번호 1–22, 고번호 23–45
          </p>
          {topEntries(dist.lowHigh).map(([key, count]) => (
            <Dist key={key} label={`${key.replace(":", " : ")}`} value={count} total={scope.length} />
          ))}
        </section>
        <section className="card">
          <h3>연속 번호 쌍</h3>
          <p style={{ color: "var(--dim)", fontSize: 12, marginTop: 0 }}>기준 {periodLabel}</p>
          {topEntries(dist.consecutive).map(([key, count]) => (
            <Dist key={key} label={`${key}쌍`} value={count} total={scope.length} />
          ))}
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h3>번호 구간 분포 · {periodLabel}</h3>
        {BANDS.map((band, i) => (
          <Dist key={band.label} label={band.label} value={dist.bands[i]} total={dist.bands.reduce((a, b) => a + b, 0)} />
        ))}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h3>{recentOnly ? `최근 ${RECENT_WINDOW}회 흐름` : "최근 흐름"}</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>회차</th>
                <th className="hide-sm">날짜</th>
                <th>번호</th>
                <th className="hide-sm">홀짝</th>
                <th className="hide-sm">저고</th>
                <th>합계</th>
              </tr>
            </thead>
            <tbody>
              {history.map((draw) => {
                const odd = draw.numbers.filter((n) => n % 2 === 1).length;
                const low = draw.numbers.filter((n) => n <= 22).length;
                const sum = draw.numbers.reduce((a, b) => a + b, 0);
                return (
                  <tr key={draw.drawNo}>
                    <td className="mono">{draw.drawNo}</td>
                    <td className="hide-sm">{formatDate(draw.date)}</td>
                    <td className="mono nowrap">{draw.numbers.join("  ")}</td>
                    <td className="hide-sm">
                      {odd}:{6 - odd}
                    </td>
                    <td className="hide-sm">
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
  recentOnly,
}: {
  items: { n: number; recentCount: number; frequencyCount: number; lastSeenAgo: number }[];
  kind: "hot" | "cold";
  recentOnly: boolean;
}) {
  return (
    <div className="grid" style={{ gap: 10 }}>
      {items.map((item) => (
        <div key={item.n} className="kv" style={{ alignItems: "center" }}>
          <Ball n={item.n} size="sm" />
          {recentOnly ? (
            kind === "hot" ? (
              <span>
                최근 {item.recentCount}회 출현 · 누적 {item.frequencyCount}회
              </span>
            ) : (
              <span>
                {item.lastSeenAgo}회 전 마지막 출현 · 누적 {item.frequencyCount}회
              </span>
            )
          ) : (
            <span>
              누적 {item.frequencyCount}회 · 최근 {item.recentCount}회
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
