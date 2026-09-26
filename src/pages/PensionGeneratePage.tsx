import { useState } from "react";
import { PensionRow } from "../components/PensionBalls";
import { PENSION_RANK_LABEL } from "../lib/constants";
import { useApp } from "../lib/context";
import { comparePension } from "../lib/pensionCompare";
import { latestPension } from "../lib/pensionData";
import { generatePensionAiCombos, generatePensionCombos } from "../lib/pensionGenerator";
import { loadOpenAiKey, saveOpenAiKey } from "../lib/storage";
import { STRATEGIES, type GeneratedPension, type Strategy } from "../types";

const PENSION_STRATEGIES = STRATEGIES.map((item) =>
  item.id === "balanced"
    ? { ...item, summary: "홀수 2–4개, 서로 다른 숫자 4개 이상, 합계 15–39를 맞추고 자리별 빈도를 약하게 반영합니다." }
    : item.id === "hot"
      ? { ...item, summary: "최근 20회에서 자리마다 자주 나온 숫자에 가중치를 둡니다." }
      : item.id === "frequency"
        ? { ...item, summary: "1회부터 자리마다 많이 나온 숫자에 가중치를 둡니다." }
        : item.id === "mixed"
          ? { ...item, summary: "자주 나온 자리 숫자와 적게 나온 조를 섞어 한쪽으로 치우치지 않게 합니다." }
          : {
              ...item,
              summary:
                "GPT가 조 빈도, 자리별 숫자, 끝자리 패턴을 보고 제안합니다. 1등 확률은 바뀌지 않습니다.",
            },
);

export function PensionGeneratePage() {
  const {
    pensionDraws,
    disclaimerAccepted,
    acceptDisclaimer,
    savePensionCombo,
    savedPension,
    setView,
  } = useApp();
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [gameCount, setGameCount] = useState(5);
  const [combos, setCombos] = useState<GeneratedPension[]>([]);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [apiKeyDraft, setApiKeyDraft] = useState(loadOpenAiKey);
  const [showKey, setShowKey] = useState(false);
  const nextDraw = latestPension(pensionDraws).drawNo + 1;

  const run = async () => {
    if (!disclaimerAccepted || busy) return;
    setError("");
    if (strategy === "ai") {
      const key = apiKeyDraft.trim() || loadOpenAiKey();
      if (!key) {
        setError("AI 추첨에는 OpenAI API 키가 필요합니다. 키를 입력한 뒤 저장하세요.");
        return;
      }
      saveOpenAiKey(key);
      setBusy(true);
      const started = performance.now();
      try {
        const next = await generatePensionAiCombos(pensionDraws, gameCount, key);
        setElapsed(Math.max(1, Math.round(performance.now() - started)));
        setCombos(next);
      } catch (err) {
        setElapsed(null);
        setCombos([]);
        setError(err instanceof Error ? err.message : "GPT 생성에 실패했습니다.");
      } finally {
        setBusy(false);
      }
      return;
    }
    const started = performance.now();
    setCombos(generatePensionCombos(pensionDraws, strategy, gameCount));
    setElapsed(Math.max(1, Math.round(performance.now() - started)));
  };

  return (
    <>
      {!disclaimerAccepted && (
        <div className="modal-back">
          <div className="modal">
            <div className="kicker">Required notice</div>
            <h3>통계는 당첨을 보장하지 않습니다</h3>
            <p>
              연금복권720+ 각 회차는 독립 시행입니다. 조 1–5와 6자리 숫자의 모든 조합의 1등 확률은 같습니다.
              자리별 빈도나 AI 추첨은 검토용이며 예측이 아닙니다.
            </p>
            <p>
              생성 결과를 확정적 예언으로 오해하거나, 손실을 만회하려고 반복 구매하지 마세요.
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
          <div className="kicker">Generate · 720+</div>
          <h2>연금복권 번호 생성</h2>
          <p>
            조와 6자리를 한 번에 만듭니다. 끝자리부터 맞는 개수로 3–7등을 미리 볼 수 있습니다. 대상 회차는{" "}
            {nextDraw}회입니다.
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
          <button
            className="btn primary btn-wide"
            onClick={() => void run()}
            disabled={!disclaimerAccepted || busy}
          >
            {busy ? "GPT 검토 중…" : `번호 ${gameCount}게임 생성`}
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h3>생성 기준 선택</h3>
          <div className="strategy">
            {PENSION_STRATEGIES.map((item) => (
              <label key={item.id} className={strategy === item.id ? "selected" : ""}>
                <input
                  type="radio"
                  name="pension-strategy"
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
          {strategy === "ai" && (
            <div style={{ marginTop: 16 }}>
              <label className="field">
                OpenAI API 키
                <input
                  type={showKey ? "text" : "password"}
                  autoComplete="off"
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  placeholder="sk-..."
                />
              </label>
              <div className="btn-row" style={{ marginTop: 10 }}>
                <button className="btn" type="button" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? "키 숨기기" : "키 보기"}
                </button>
                <button className="btn" type="button" onClick={() => saveOpenAiKey(apiKeyDraft)}>
                  키 저장
                </button>
              </div>
            </div>
          )}
        </section>
        <section className="card">
          <h3>생성 시 함께 보는 정보</h3>
          <ul className="meta-list">
            <li>조 1–5와 십만–일 자리 숫자는 따로 뽑습니다. 같은 숫자가 반복될 수 있습니다</li>
            <li>최근 40회 1등 세트와 같은 조+번호는 다시 뽑지 않습니다</li>
            <li>직전 회차와 끝자리부터 맞춰 등수를 미리 보여 줍니다</li>
          </ul>
          {error && (
            <p className="stat" style={{ marginTop: 16, color: "var(--bad)" }}>
              {error}
            </p>
          )}
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
          기준을 고른 뒤 원클릭으로 조와 6자리를 만드세요. 저장한 번호는 ‘저장 · 비교’에서 공식 결과와 맞춰볼 수
          있습니다.
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 16 }}>
          {combos.map((combo, index) => {
            const already = savedPension.some((s) => s.id === combo.id);
            const latest = latestPension(pensionDraws);
            const against = comparePension(combo.group, combo.digits, latest);
            return (
              <article key={combo.id} className="card combo">
                <div className="combo-top">
                  <div>
                    <div className="kicker">
                      Game {index + 1} · {PENSION_STRATEGIES.find((s) => s.id === combo.strategy)?.label}
                    </div>
                    <PensionRow group={combo.group} digits={combo.digits} hitsFromRight={against.suffixHits} />
                  </div>
                  <button
                    className="btn"
                    disabled={already}
                    onClick={() => savePensionCombo({ ...combo, targetDrawNo: nextDraw })}
                  >
                    {already ? "저장됨" : "이 조합 저장"}
                  </button>
                </div>
                <div className="kv">
                  <span>
                    직전 {latest.drawNo}회 끝자리{" "}
                    <b className={`rank-${Math.min(against.rank, 5)}`}>
                      {against.suffixHits}개 · {PENSION_RANK_LABEL[against.rank]}
                    </b>
                  </span>
                  <span>
                    홀짝 <b>{combo.analysis.oddEven[0]}:{combo.analysis.oddEven[1]}</b>
                  </span>
                  <span>
                    합계 <b>{combo.analysis.digitSum}</b>
                  </span>
                  <span>
                    서로 다른 숫자 <b>{combo.analysis.uniqueDigits}</b>
                  </span>
                </div>
                <ul className="meta-list">
                  {combo.analysis.appliedCriteria.map((line) => (
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
