import { PensionRow } from "../components/PensionBalls";
import { officialPensionUrl, PENSION_POS_LABEL } from "../lib/constants";
import { useApp } from "../lib/context";
import { addDays, formatDate } from "../lib/format";
import { latestPension } from "../lib/pensionData";
import { pensionProfiles, topDigits } from "../lib/pensionStats";

export function PensionHomePage() {
  const { pensionDraws, status, refresh, setView } = useApp();
  const latest = latestPension(pensionDraws);
  const profiles = pensionProfiles(pensionDraws);
  const nextDate = addDays(latest.date, 7);
  const hotPos = profiles.recentPosCounts.map((counts) => topDigits(counts, 1)[0]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Pension 720+</div>
          <h2>연금복권 최신 회차</h2>
          <p>
            {status.totalDraws.toLocaleString("ko-KR")}개 회차가 반영되어 있습니다. 조 1–5와 6자리 숫자는 자리가
            고정되어 있고, 통계는 다음 회차 확률을 바꾸지 않습니다.
          </p>
        </div>
        <div className="btn-row page-actions">
          <button className="btn" onClick={() => void refresh()} disabled={status.refreshState === "loading"}>
            {status.refreshState === "loading" ? "확인 중…" : "최신 회차 확인"}
          </button>
          <button className="btn primary" onClick={() => setView("generate")}>
            번호 생성하기
          </button>
        </div>
      </div>

      <div className="dash">
        <section className="hero-draw card dash-latest">
          <div className="hero-meta">
            <div>
              <div className="kicker">Latest draw</div>
              <strong>
                {latest.drawNo}회 · {formatDate(latest.date)}
              </strong>
            </div>
            <div>
              다음 예정 {latest.drawNo + 1}회 · {formatDate(nextDate)}
              <div>추첨은 매주 목요일 저녁 7시 5분, 판매 마감은 당일 오후 8시입니다.</div>
            </div>
          </div>
          <PensionRow group={latest.group} digits={latest.digits} bonus={latest.bonusDigits} />
          <div className="kv">
            <span>
              1등 <b>{latest.group}조 {latest.digits.join("")}</b>
            </span>
            <span>
              보너스 <b>각조 {latest.bonusDigits.join("")}</b>
            </span>
            <a href={officialPensionUrl(latest.drawNo)} target="_blank" rel="noreferrer">
              공식 결과 대조
            </a>
          </div>
        </section>
        <section className="card dash-status">
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
        </section>
        <section className="card dash-recent">
          <h3>최근 20회 자리별 상위</h3>
          <p style={{ color: "var(--muted)" }}>
            {hotPos.map((item, i) => `${PENSION_POS_LABEL[i]} ${item.digit}`).join(" · ")}
          </p>
          <p style={{ color: "var(--dim)", fontSize: 12, marginBottom: 0 }}>최근 흐름이며 향후 출현을 의미하지 않습니다.</p>
        </section>
        <section className="card dash-alltime">
          <h3>조 출현</h3>
          <p style={{ color: "var(--muted)" }}>
            {profiles.groupCounts.map((count, i) => `${i + 1}조 ${count}회`).join(" · ")}
          </p>
        </section>
        <section className="card dash-typical">
          <h3>등수 기준</h3>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            1등 조+6자리, 2등 6자리, 3–7등 끝자리 5–1개, 보너스는 각조 6자리입니다.
          </p>
        </section>
      </div>
    </>
  );
}
