import { useState } from "react";
import { WEEKDAYS } from "../lib/constants";
import { useApp } from "../lib/context";
import { pad2 } from "../lib/format";
import { requestNotifyPermission, scheduleLabel } from "../lib/notifications";
import { latestDraw } from "../lib/stats";

export function AlertsPage() {
  const { alerts, updateAlerts, clearLocalData, saved, disclaimerAccepted, draws } = useApp();
  const [permission, setPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "denied",
  );
  const nextDraw = latestDraw(draws).drawNo + 1;

  const enable = async () => {
    const result = await requestNotifyPermission();
    setPermission(result);
    if (result === "granted") updateAlerts({ enabled: true });
    else updateAlerts({ enabled: false });
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Reminders</div>
          <h2>구매 시점 검토 알림</h2>
          <p>
            알림은 다음 추첨 전에 저장한 번호를 다시 볼 수 있게 돕기 위한 것입니다. 구매를 재촉하거나 반복 구매를
            유도하지 않으며, 한 주에 한 번만 표시됩니다.
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
            브라우저 권한 {permission} · 다음 대상 {nextDraw}회
          </p>
        </section>

        <section className="card">
          <h3>남용과 오류를 줄이는 방식</h3>
          <ul className="meta-list">
            <li>같은 주에는 중복 발송하지 않습니다.</li>
            <li>탭이 열려 있을 때만 시각을 확인하고, 서버 푸시는 사용하지 않습니다.</li>
            <li>문구에 당첨 가능성이나 구매 독려를 넣지 않습니다.</li>
            <li>알림 시각과 설정은 이 브라우저의 로컬 저장소에만 남습니다.</li>
          </ul>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h3>개인정보와 로컬 데이터</h3>
        <p style={{ color: "var(--muted)" }}>
          계정, 이메일, 전화번호는 받지 않습니다. 저장된 번호 {saved.length}개, 안내 확인 여부{" "}
          {disclaimerAccepted ? "예" : "아니오"}, 알림 설정이 이 기기에만 있습니다. 공용 컴퓨터를 쓰면 사용 후
          아래 버튼으로 지우는 것이 안전합니다.
        </p>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm("이 브라우저에 저장된 번호, 안내 확인, 알림 설정을 모두 삭제할까요?")) {
              clearLocalData();
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
