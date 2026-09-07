import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AlertSettings, DataStatus, Draw, SavedCombo, View } from "../types";
import { compareCombo } from "./compare";
import { loadLocalDraws, refreshDraws, validateDraw } from "./data";
import { latestDraw } from "./stats";
import {
  loadAlerts,
  loadDisclaimerAccepted,
  loadSaved,
  saveAlerts,
  saveDisclaimerAccepted,
  saveSaved,
  clearAllUserData,
} from "./storage";
import { reminderDue, showPurchaseReminder } from "./notifications";
import { weekKey } from "./format";

interface AppState {
  view: View;
  setView: (view: View) => void;
  draws: Draw[];
  status: DataStatus;
  refresh: () => Promise<void>;
  disclaimerAccepted: boolean;
  acceptDisclaimer: () => void;
  saved: SavedCombo[];
  saveCombo: (combo: Omit<SavedCombo, "targetDrawNo"> & { targetDrawNo?: number }) => void;
  removeSaved: (id: string) => void;
  alerts: AlertSettings;
  updateAlerts: (patch: Partial<AlertSettings>) => void;
  reminderBanner: string | null;
  dismissReminder: () => void;
  clearLocalData: () => void;
}

const Ctx = createContext<AppState | null>(null);

function buildStatus(draws: Draw[], extra: Partial<DataStatus> = {}): DataStatus {
  const latest = latestDraw(draws);
  return {
    latestDrawNo: latest.drawNo,
    latestDate: latest.date,
    totalDraws: draws.length,
    source: "동행복권 회차 결과 공개 데이터",
    updatedAt: extra.updatedAt ?? new Date().toISOString(),
    refreshState: extra.refreshState ?? "idle",
    refreshMessage: extra.refreshMessage ?? `${latest.drawNo}회까지 반영됨`,
  };
}

function applyComparisons(items: SavedCombo[], draws: Draw[]): SavedCombo[] {
  const byNo = new Map(draws.map((d) => [d.drawNo, d]));
  return items.map((item) => {
    const draw = byNo.get(item.targetDrawNo);
    if (!draw || !validateDraw(draw)) return item;
    const result = compareCombo(item.numbers, draw);
    return {
      ...item,
      comparedDrawNo: draw.drawNo,
      matches: result.matches,
      bonusHit: result.bonusHit,
      rank: result.rank,
    };
  });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("home");
  const [draws, setDraws] = useState<Draw[]>(() => loadLocalDraws());
  const [status, setStatus] = useState<DataStatus>(() => buildStatus(loadLocalDraws()));
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(loadDisclaimerAccepted);
  const [saved, setSaved] = useState<SavedCombo[]>(() => applyComparisons(loadSaved(), loadLocalDraws()));
  const [alerts, setAlerts] = useState<AlertSettings>(loadAlerts);
  const [reminderBanner, setReminderBanner] = useState<string | null>(null);

  useEffect(() => {
    const valid = draws.filter(validateDraw);
    if (valid.length !== draws.length) {
      setDraws(valid);
      setStatus(buildStatus(valid, { refreshState: "error", refreshMessage: "손상된 회차 데이터를 제외했습니다." }));
    }
  }, [draws]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus((s) => ({ ...s, refreshState: "loading", refreshMessage: "최신 회차를 확인하는 중…" }));
      try {
        const { draws: next, added } = await refreshDraws(loadLocalDraws());
        if (cancelled) return;
        const checked = next.filter(validateDraw);
        setDraws(checked);
        setSaved((items) => {
          const updated = applyComparisons(items, checked);
          saveSaved(updated);
          return updated;
        });
        setStatus(
          buildStatus(checked, {
            refreshState: "ok",
            refreshMessage:
              added > 0 ? `${added}개 회차를 추가로 반영했습니다.` : "이미 최신 회차까지 반영되어 있습니다.",
          }),
        );
      } catch {
        if (cancelled) return;
        setStatus((s) => ({
          ...s,
          refreshState: "error",
          refreshMessage: "온라인 업데이트를 건너뛰고 내장 회차 데이터를 사용합니다.",
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!reminderDue(alerts)) return;
    const nextNo = latestDraw(draws).drawNo + 1;
    showPurchaseReminder(nextNo);
    const next = { ...alerts, lastNotifiedWeek: weekKey() };
    setAlerts(next);
    saveAlerts(next);
    setReminderBanner(`${nextNo}회 추첨 전 번호를 검토할 시간입니다. 알림은 구매를 권유하지 않습니다.`);
  }, [alerts, draws]);

  const refresh = useCallback(async () => {
    setStatus((s) => ({ ...s, refreshState: "loading", refreshMessage: "최신 회차를 확인하는 중…" }));
    try {
      const { draws: next, added } = await refreshDraws(draws);
      const checked = next.filter(validateDraw);
      setDraws(checked);
      setSaved((items) => {
        const updated = applyComparisons(items, checked);
        saveSaved(updated);
        return updated;
      });
      setStatus(
        buildStatus(checked, {
          refreshState: "ok",
          refreshMessage: added > 0 ? `${added}개 회차를 추가로 반영했습니다.` : "이미 최신 회차까지 반영되어 있습니다.",
        }),
      );
    } catch (error) {
      setStatus((s) => ({
        ...s,
        refreshState: "error",
        refreshMessage: error instanceof Error ? error.message : "데이터 업데이트에 실패했습니다.",
      }));
    }
  }, [draws]);

  const acceptDisclaimer = useCallback(() => {
    setDisclaimerAccepted(true);
    saveDisclaimerAccepted(true);
  }, []);

  const saveCombo = useCallback(
    (combo: Omit<SavedCombo, "targetDrawNo"> & { targetDrawNo?: number }) => {
      setSaved((items) => {
        if (items.some((x) => x.id === combo.id)) return items;
        const next: SavedCombo[] = applyComparisons(
          [{ ...combo, targetDrawNo: combo.targetDrawNo ?? latestDraw(draws).drawNo + 1 }, ...items],
          draws,
        );
        saveSaved(next);
        return next;
      });
    },
    [draws],
  );

  const removeSaved = useCallback((id: string) => {
    setSaved((items) => {
      const next = items.filter((x) => x.id !== id);
      saveSaved(next);
      return next;
    });
  }, []);

  const updateAlerts = useCallback((patch: Partial<AlertSettings>) => {
    setAlerts((current) => {
      const next = { ...current, ...patch };
      saveAlerts(next);
      return next;
    });
  }, []);

  const dismissReminder = useCallback(() => setReminderBanner(null), []);

  const clearLocalData = useCallback(() => {
    clearAllUserData();
    setDisclaimerAccepted(false);
    setSaved([]);
    setAlerts(loadAlerts());
    setReminderBanner(null);
  }, []);

  const value = useMemo(
    () => ({
      view,
      setView,
      draws,
      status,
      refresh,
      disclaimerAccepted,
      acceptDisclaimer,
      saved,
      saveCombo,
      removeSaved,
      alerts,
      updateAlerts,
      reminderBanner,
      dismissReminder,
      clearLocalData,
    }),
    [
      view,
      draws,
      status,
      refresh,
      disclaimerAccepted,
      acceptDisclaimer,
      saved,
      saveCombo,
      removeSaved,
      alerts,
      updateAlerts,
      reminderBanner,
      dismissReminder,
      clearLocalData,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
