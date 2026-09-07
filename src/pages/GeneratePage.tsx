import { useState } from "react";
import { Ball, BallRow } from "../components/Ball";
import { useApp } from "../lib/context";
import { compareCombo } from "../lib/compare";
import { generateCombos } from "../lib/generator";
import { BANDS, RANK_LABEL } from "../lib/constants";
import { latestDraw } from "../lib/stats";
import { STRATEGIES, type GeneratedCombo, type Strategy } from "../types";

export function GeneratePage() {
  const { draws, disclaimerAccepted, acceptDisclaimer, saveCombo, saved, setView } = useApp();
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [gameCount, setGameCount] = useState(5);
  const [combos, setCombos] = useState<GeneratedCombo[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const nextDraw = latestDraw(draws).drawNo + 1;

  const run = () => {
    if (!disclaimerAccepted) return;
    const started = performance.now();
    const next = generateCombos(draws, strategy, gameCount);
    setElapsed(Math.max(1, Math.round(performance.now() - started)));
    setCombos(next);
  };

  return (
    <>
      {!disclaimerAccepted && (
        <div className="modal-back">
          <div className="modal">
            <div className="kicker">Required notice</div>
            <h3>통계는 당첨을 보장하지 않습니다</h3>
            <p>
              로또 각 회차의 추첨은 독립 시행입니다. 1부터 45까지 6개를 고른 모든 조합의 당첨 확률은 같습니다.
              출현 빈도, 최근 추세, 홀짝·저고·구간 분포는 번호를 검토하는 참고 정보일 뿐 예측이 아닙니다.
            </p>
            <p>
              생성 결과를 확정적 예언으로 오해하거나, 손실을 만회하려고 반복 구매하지 마세요. 구매 여부는
              본인 판단이며 과도한 구매는 권장하지 않습니다.
            </p>
            <div className="btn-row">
              <button className="btn primary" onClick={acceptDisclaimer}>
                안내를 확인했습니다
              </button>
              <button className="btn ghost" onClick={() => setView("home")}>
                돌아가기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-head">
        <div>
          <div className="kicker">Generate</div>
          <h2>통계 기준 원클릭 생성</h2>
          <p>
            원하는 게임 수만큼 한 번에 만듭니다. 각 조합에는 적용된 기준과 번호별 빈도·추세 태그가 함께 표시됩니다.
            대상 회차는 {nextDraw}회입니다.
          </p>
        </div>
        <div className="generate-actions">
          <div>
            <div className="kicker">게임 수</div>
            <div className="count-pick">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn ${gameCount === n ? "primary" : ""}`}
                  onClick={() => setGameCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button className="btn primary" onClick={run} disabled={!disclaimerAccepted}>
            번호 {gameCount}게임 생성
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h3>생성 기준 선택</h3>
          <div className="strategy">
            {STRATEGIES.map((item) => (
              <label key={item.id} className={strategy === item.id ? "selected" : ""}>
                <input
                  type="radio"
                  name="strategy"
                  value={item.id}
                  checked={strategy === item.id}
                  onChange={() => setStrategy(item.id)}
                  style={{ display: "none" }}
                />
                <h4>{item.label}</h4>
                <p>{item.summary}</p>
              </label>
            ))}
          </div>
        </section>
        <section className="card">
          <h3>생성 시 함께 보는 정보</h3>
          <ul className="meta-list">
            <li>전체 출현 빈도와 최근 20회 추세를 번호마다 분리해 표시</li>
            <li>홀짝, 저고, 구간, 합계, 연속 쌍이 과거 전형과 얼마나 가까운지 요약</li>
            <li>최근 80회와 동일한 당첨 번호 세트는 다시 뽑지 않음</li>
            <li>결과는 이 브라우저에만 저장되며 서버로 전송되지 않음</li>
          </ul>
          {elapsed != null && (
            <p className="stat" style={{ marginTop: 16 }}>
              <b>{elapsed}ms</b>
              이번 생성 응답 시간
            </p>
          )}
        </section>
      </div>

      {combos.length === 0 ? (
        <div className="card empty" style={{ marginTop: 16 }}>
          기준을 고른 뒤 원클릭으로 조합을 만드세요. 저장한 번호는 ‘저장 · 비교’에서 실제 당첨 결과와 맞춰볼 수
          있습니다.
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 16 }}>
          {combos.map((combo, index) => {
            const already = saved.some((s) => s.id === combo.id);
            const a = combo.analysis;
            const latest = latestDraw(draws);
            const againstLatest = compareCombo(combo.numbers, latest);
            return (
              <article key={combo.id} className="card combo">
                <div className="combo-top">
                  <div>
                    <div className="kicker">
                      Game {index + 1} · {STRATEGIES.find((s) => s.id === combo.strategy)?.label}
                    </div>
                    <BallRow numbers={combo.numbers} />
                  </div>
                  <button className="btn" disabled={already} onClick={() => saveCombo({ ...combo, targetDrawNo: nextDraw })}>
                    {already ? "저장됨" : "이 조합 저장"}
                  </button>
                </div>
                <div className="kv">
                  <span>
                    직전 {latest.drawNo}회 대입 <b className={`rank-${againstLatest.rank}`}>{againstLatest.matches}개 · {RANK_LABEL[againstLatest.rank]}</b>
                  </span>
                  <span>
                    홀짝 <b>{a.oddEven[0]}:{a.oddEven[1]}</b>
                    {a.vsTypical.oddEvenCommon ? " · 전형" : ""}
                  </span>
                  <span>
                    저고 <b>{a.lowHigh[0]}:{a.lowHigh[1]}</b>
                  </span>
                  <span>
                    합계 <b>{a.sum}</b>
                    {a.vsTypical.sumInTypical ? " · 전형 구간" : ""}
                  </span>
                  <span>
                    연속 <b>{a.consecutivePairs}쌍</b>
                  </span>
                  <span>
                    구간 <b>{BANDS.map((b, i) => `${b.label} ${a.bands[i]}`).join(" / ")}</b>
                  </span>
                </div>
                <div className="btn-row">
                  {a.profiles.map((p) => (
                    <span key={p.n} className={`chip ${p.tag}`}>
                      <Ball n={p.n} size="sm" />
                      누적 {p.frequencyCount} · 최근 {p.recentCount} · {p.lastSeenAgo}회 전
                    </span>
                  ))}
                </div>
                <ul className="meta-list">
                  {a.appliedCriteria.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
