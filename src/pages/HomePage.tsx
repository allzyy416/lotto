import { BallRow } from "../components/Ball";
import { OFFICIAL_RESULT_URL } from "../lib/constants";
import { useApp } from "../lib/context";
import { addDays, formatCount, formatDate, formatWon } from "../lib/format";
import { distribution, latestDraw, numberProfiles } from "../lib/stats";

export function HomePage() {
  const { draws, status, refresh, setView } = useApp();
  const latest = latestDraw(draws);
  const recent = numberProfiles(draws);
  const hot = [...recent].sort((a, b) => b.recentCount - a.recentCount || a.lastSeenAgo - b.lastSeenAgo).slice(0, 6);
  const frequent = [...recent].sort((a, b) => b.frequencyCount - a.frequencyCount).slice(0, 6);
  const dist = distribution(draws);
  const nextDate = addDays(latest.date, 7);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Dashboard</div>
          <h2>최신 회차와 데이터 상태</h2>
          <p>
            {status.totalDraws.toLocaleString("ko-KR")}개 회차가 반영되어 있습니다. 번호를 만들기 전에 최신
            결과와 전형적인 분포만 먼저 살펴보세요.
          </p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => void refresh()} disabled={status.refreshState === "loading"}>
            {status.refreshState === "loading" ? "확인 중…" : "최신 회차 확인"}
          </button>
          <button className="btn primary" onClick={() => setView("generate")}>
            번호 생성하기
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="hero-draw card">
          <div className="hero-meta">
            <div>
              <div className="kicker">Latest draw</div>
              <strong>
                {latest.drawNo}회 · {formatDate(latest.date)}
              </strong>
            </div>
            <div>
              다음 예정 {latest.drawNo + 1}회 · {formatDate(nextDate)}
              <div>추첨은 매주 토요일 저녁, 판매 마감은 당일 오후 8시입니다.</div>
            </div>
          </div>
          <BallRow numbers={latest.numbers} bonus={latest.bonus} />
          <div className="kv">
            <span>
              1등 {formatCount(latest.firstWinners)}게임 · <b>{formatWon(latest.firstPrize)}</b>
            </span>
            <span>
              총 판매 <b>{formatWon(latest.sales)}</b>
            </span>
            <a href={OFFICIAL_RESULT_URL} target="_blank" rel="noreferrer">
              공식 결과 대조
            </a>
          </div>
        </section>

        <section className="card">
          <div className="kicker">Data status</div>
          <h3>데이터 반영 상태</h3>
          <p className="stat">
            <b>
              <span
                className={`status-dot ${status.refreshState === "error" ? "error" : status.refreshState === "loading" ? "loading" : ""}`}
              />
              {status.latestDrawNo}회
            </b>
            {status.refreshMessage}
          </p>
          <p className="stat" style={{ marginTop: 12 }}>
            출처
            <b style={{ fontSize: 15, fontFamily: "var(--sans)" }}>{status.source}</b>
          </p>
          <p style={{ color: "var(--dim)", fontSize: 12, marginBottom: 0 }}>
            잘못된 회차 번호는 비교 결과를 왜곡하므로, 저장 비교 전에 공식 발표와 숫자가 같은지 확인하는 것이
            좋습니다.
          </p>
        </section>
      </div>

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <section className="card">
          <div className="kicker">Recent 20</div>
          <h3>최근 추세 상위</h3>
          <BallRow numbers={hot.map((p) => p.n)} />
          <p style={{ color: "var(--muted)", fontSize: 13 }}>최근 20회에서 더 자주 보인 번호입니다. 향후 출현을 의미하지 않습니다.</p>
        </section>
        <section className="card">
          <div className="kicker">All-time</div>
          <h3>전체 빈도 상위</h3>
          <BallRow numbers={frequent.map((p) => p.n)} />
          <p style={{ color: "var(--muted)", fontSize: 13 }}>1회부터 누적 출현이 많은 번호입니다. 빈도와 최근 추세는 따로 봅니다.</p>
        </section>
        <section className="card">
          <div className="kicker">Typical shape</div>
          <h3>과거 전형 분포</h3>
          <p className="stat">
            <b>
              홀수 {dist.avgOdd.toFixed(1)} · 저번호 {dist.avgLow.toFixed(1)}
            </b>
            평균 합계 {dist.avgSum.toFixed(0)}
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            생성기는 이 구간을 참고해 조합을 고르지만, 당첨 확률을 바꾸지는 않습니다.
          </p>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="kicker">Recent history</div>
        <h3>최근 8회 당첨 번호</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>회차</th>
                <th>추첨일</th>
                <th>당첨 번호</th>
                <th>1등</th>
              </tr>
            </thead>
            <tbody>
              {[...draws].reverse().slice(0, 8).map((draw) => (
                <tr key={draw.drawNo}>
                  <td className="mono">{draw.drawNo}</td>
                  <td>{formatDate(draw.date)}</td>
                  <td>
                    <div className="balls">
                      {draw.numbers.map((n) => (
                        <span key={n} className="mono">
                          {n}
                        </span>
                      ))}
                      <span className="plus">+</span>
                      <span className="mono">{draw.bonus}</span>
                    </div>
                  </td>
                  <td>
                    {formatCount(draw.firstWinners)} · {formatWon(draw.firstPrize)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
