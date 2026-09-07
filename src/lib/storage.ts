import type { AlertSettings, SavedCombo } from "../types";

const KEYS = {
  disclaimer: "lottolab:disclaimer",
  saved: "lottolab:saved",
  alerts: "lottolab:alerts",
  extraDraws: "lottolab:extraDraws",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadDisclaimerAccepted(): boolean {
  return read(KEYS.disclaimer, false);
}

export function saveDisclaimerAccepted(value: boolean): void {
  write(KEYS.disclaimer, value);
}

export function loadSaved(): SavedCombo[] {
  return read<SavedCombo[]>(KEYS.saved, []);
}

export function saveSaved(items: SavedCombo[]): void {
  write(KEYS.saved, items);
}

export const DEFAULT_ALERTS: AlertSettings = {
  enabled: false,
  weekday: 6,
  hour: 18,
  minute: 0,
  lastNotifiedWeek: "",
};

export function loadAlerts(): AlertSettings {
  return { ...DEFAULT_ALERTS, ...read<Partial<AlertSettings>>(KEYS.alerts, {}) };
}

export function saveAlerts(settings: AlertSettings): void {
  write(KEYS.alerts, settings);
}

export function loadExtraDraws() {
  return read<import("../types").Draw[]>(KEYS.extraDraws, []);
}

export function saveExtraDraws(draws: import("../types").Draw[]): void {
  write(KEYS.extraDraws, draws);
}

export function clearAllUserData(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}
