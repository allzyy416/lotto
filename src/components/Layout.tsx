import type { ReactNode } from "react";
import { OFFICIAL_RESULT_URL } from "../lib/constants";
import { useApp } from "../lib/context";
import { VIEWS } from "../types";

export function Layout({ children }: { children: ReactNode }) {
  const { view, setView, status, reminderBanner, dismissReminder } = useApp();

  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setView("home");
          }}
        >
          <div className="brand-mark">
            <img src="/brand-mark.png" alt="" width={36} height={36} />
          </div>
          <div>
            <h1>로또랩</h1>
            <p>통계로 검토하는 번호 생성</p>
          </div>
        </a>
        <div className="header-status">
          <span
            className={`status-dot ${status.refreshState === "error" ? "error" : status.refreshState === "loading" ? "loading" : ""}`}
          />
          {status.latestDrawNo}회
        </div>
        <nav className="nav nav-side">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div>
            <span
              className={`status-dot ${status.refreshState === "error" ? "error" : status.refreshState === "loading" ? "loading" : ""}`}
            />
            {status.latestDrawNo}회까지 반영
          </div>
          각 회차 추첨은 독립적이며 모든 조합의 당첨 확률은 같습니다. 통계는 예측이 아닙니다.
        </div>
      </aside>
      <main className="main">
        {reminderBanner && (
          <div className="banner alert">
            <p>
              <strong>검토 알림</strong> · {reminderBanner}
            </p>
            <button className="btn ghost" onClick={dismissReminder}>
              닫기
            </button>
          </div>
        )}
        <div className="banner">
          <p>
            <strong>안내</strong> · 과거 데이터와 최근 추세는 미래 당첨을 예측하거나 확률을 높이지 않습니다.
            최종 구매 전{" "}
            <a href={OFFICIAL_RESULT_URL} target="_blank" rel="noreferrer">
              동행복권 공식 결과
            </a>
            를 확인하세요.
          </p>
        </div>
        {children}
      </main>
      <nav className="nav-bottom" aria-label="주요 메뉴">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            onClick={() => setView(item.id)}
          >
            {item.short}
          </button>
        ))}
      </nav>
    </div>
  );
}
