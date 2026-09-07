import { useState } from "react";
import { WEEKDAYS } from "../lib/constants";
import { useApp } from "../lib/context";
import { pad2 } from "../lib/format";
import { requestNotifyPermission, scheduleLabel } from "../lib/notifications";
import { latestDraw } from "../lib/stats";
import { fetchChatId, maskToken, sendTelegram, telegramReady } from "../lib/telegram";

export function AlertsPage() {
  const {
    alerts,
    updateAlerts,
    telegram,
    updateTelegram,
    clearLocalData,
    saved,
    disclaimerAccepted,
    draws,
  } = useApp();
  const [permission, setPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "denied",
  );
  const [tokenDraft, setTokenDraft] = useState(telegram.botToken);
  const [showToken, setShowToken] = useState(false);
  const [tgMessage, setTgMessage] = useState("");
  const [tgBusy, setTgBusy] = useState(false);
  const nextDraw = latestDraw(draws).drawNo + 1;
  const bought = saved.filter((item) => item.purchased && item.targetDrawNo === nextDraw).length;

  const enable = async () => {
    const result = await requestNotifyPermission();
    setPermission(result);
    if (result === "granted") updateAlerts({ enabled: true });
    else updateAlerts({ enabled: false });
  };

  const saveToken = () => {
    updateTelegram({ botToken: tokenDraft.trim() });
    setTgMessage("봇 토큰을 이 브라우저에만 저장했습니다.");
  };

  const detectChat = async () => {
    setTgBusy(true);
    setTgMessage("");
    try {
      const chatId = await fetchChatId(tokenDraft || telegram.botToken);
      updateTelegram({ botToken: (tokenDraft || telegram.botToken).trim(), chatId });
      setTgMessage(`채팅 ID ${chatId}를 저장했습니다.`);
    } catch (error) {
      setTgMessage(error instanceof Error ? error.message : "채팅 ID를 가져오지 못했습니다.");
    } finally {
      setTgBusy(false);
    }
  };

  const testSend = async () => {
    setTgBusy(true);
    setTgMessage("");
    try {
      await sendTelegram(
        { ...telegram, botToken: tokenDraft || telegram.botToken },
        "ALLZYY LOTTO 연결 확인\n이 브라우저에 저장된 봇으로 메시지를 보냈습니다.",
      );
      setTgMessage("테스트 메시지를 보냈습니다. 텔레그램에서 확인해 주세요.");
    } catch (error) {
      setTgMessage(error instanceof Error ? error.message : "메시지 전송에 실패했습니다.");
    } finally {
      setTgBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Reminders</div>
          <h2>구매 시점 검토 알림</h2>
          <p>
            알림 시각이 되면 브라우저와 텔레그램으로 다음 회차 구매 표시를 알려 줍니다. 당첨번호가 새로 반영되면
            구매로 표시한 번호의 결과도 텔레그램으로 보냅니다.
          </p>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h3>알림 설정</h3>
          <p style={{ color: "var(--muted)" }}>
            기본값은 매주 토요일 18:00입니다. 판매 마감(토요일 20:00) 전에 번호를 검토할 여유를 두기 위한
            시각입니다.
          </p>
          <div className="grid grid-3">
            <label className="field">
              요일
              <select
                value={alerts.weekday}
                onChange={(e) => updateAlerts({ weekday: Number(e.target.value) })}
              >
                {WEEKDAYS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}요일
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              시
              <input
                type="number"
                min={0}
                max={23}
                value={alerts.hour}
                onChange={(e) => updateAlerts({ hour: Number(e.target.value) })}
              />
            </label>
            <label className="field">
              분
              <input
                type="number"
                min={0}
                max={59}
                value={alerts.minute}
                onChange={(e) => updateAlerts({ minute: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="btn-row" style={{ marginTop: 16 }}>
            {alerts.enabled ? (
              <button className="btn btn-wide" onClick={() => updateAlerts({ enabled: false })}>
                알림 해제
              </button>
            ) : (
              <button className="btn primary btn-wide" onClick={() => void enable()}>
                알림 설정
              </button>
            )}
          </div>
          <p className="stat" style={{ marginTop: 16 }}>
            <b>{alerts.enabled ? scheduleLabel(alerts) : "꺼짐"}</b>
            브라우저 권한 {permission} · 다음 대상 {nextDraw}회 · 구매 표시 {bought}게임
          </p>
        </section>

        <section className="card">
          <h3>텔레그램 연결</h3>
          <p style={{ color: "var(--muted)" }}>
            BotFather에서 받은 봇 토큰과 채팅 ID는 이 브라우저의 로컬 저장소에만 남습니다. 테스트 전에
            텔레그램에서 그 봇을 열고 시작을 눌러 두세요.
          </p>
          <label className="field">
            봇 토큰
            <input
              type={showToken ? "text" : "password"}
              autoComplete="off"
              value={tokenDraft}
              onChange={(e) => setTokenDraft(e.target.value)}
              placeholder="123456:ABC..."
            />
          </label>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className="btn" type="button" onClick={() => setShowToken((v) => !v)}>
              {showToken ? "토큰 숨기기" : "토큰 보기"}
            </button>
            <button className="btn" type="button" onClick={saveToken}>
              토큰 저장
            </button>
          </div>
          <label className="field" style={{ marginTop: 14 }}>
            채팅 ID
            <input
              value={telegram.chatId}
              onChange={(e) => updateTelegram({ chatId: e.target.value.trim() })}
              placeholder="숫자 ID. 모르면 봇에게 말한 뒤 가져오기"
            />
          </label>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button className="btn" type="button" disabled={tgBusy} onClick={() => void detectChat()}>
              채팅 ID 가져오기
            </button>
            <button className="btn primary" type="button" disabled={tgBusy} onClick={() => void testSend()}>
              테스트 보내기
            </button>
          </div>
          <p style={{ color: "var(--dim)", fontSize: 12, marginBottom: 0 }}>
            연결 {telegramReady({ ...telegram, botToken: tokenDraft || telegram.botToken }) ? "됨" : "안 됨"}
            {telegram.botToken ? ` · 저장 토큰 ${maskToken(telegram.botToken)}` : ""}
          </p>
          {tgMessage && <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 0 }}>{tgMessage}</p>}
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h3>이렇게 동작합니다</h3>
        <ul className="meta-list">
          <li>저장함에서 구매함을 켜 두면, 그 회차 당첨번호가 반영될 때 당첨번호·구매번호·등수를 텔레그램으로 보냅니다.</li>
          <li>구매 알림 시각이 되면 구매 표시 목록을 보내고, 없으면 검토하라는 안내만 보냅니다.</li>
          <li>같은 회차 결과와 같은 주 알림은 한 번만 보냅니다.</li>
          <li>텔레그램에서 봇에게 먼저 시작 또는 아무 말을 보낸 뒤 테스트하세요. 채팅 ID는 직접 넣어도 됩니다.</li>
        </ul>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h3>개인정보와 로컬 데이터</h3>
        <p style={{ color: "var(--muted)" }}>
          계정, 이메일, 전화번호는 받지 않습니다. 저장된 번호 {saved.length}개, 안내 확인 여부{" "}
          {disclaimerAccepted ? "예" : "아니오"}, 알림·텔레그램 설정이 이 기기에만 있습니다. 공용 컴퓨터를 쓰면
          사용 후 아래 버튼으로 지우는 것이 안전합니다.
        </p>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm("이 브라우저에 저장된 번호, 안내 확인, 알림·텔레그램 설정을 모두 삭제할까요?")) {
              clearLocalData();
              setTokenDraft("");
            }
          }}
        >
          로컬 데이터 모두 삭제
        </button>
      </section>

      <p style={{ color: "var(--dim)", fontSize: 12, marginTop: 18 }}>
        로또 운영 정책이나 공식 데이터 제공 방식이 바뀌면 회차 수집이 지연될 수 있습니다. 당첨 여부 확인은 항상
        동행복권 공식 발표를 기준으로 하세요. {pad2(alerts.hour)}:{pad2(alerts.minute)} 설정이 과도한 구매로 이어지지
        않도록, 알림은 주 1회로 제한합니다.
      </p>
    </>
  );
}
