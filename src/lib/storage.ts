import type { AlertSettings, GameKind, PensionDraw, SavedCombo, SavedPension, TelegramSettings } from "../types";

const KEYS = {
  disclaimer: "lottolab:disclaimer",
  saved: "lottolab:saved",
  alerts: "lottolab:alerts",
  extraDraws: "lottolab:extraDraws",
  telegram: "lottolab:telegram",
  openai: "lottolab:openai",
  extraPension: "lottolab:extraPension",
  savedPension: "lottolab:savedPension",
  gameKind: "lottolab:gameKind",
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
  return read<SavedCombo[]>(KEYS.saved, []).map((item) => ({
    ...item,
    purchased: Boolean(item.purchased),
  }));
}

export const DEFAULT_TELEGRAM: TelegramSettings = {
  botToken: "",
  chatId: "",
  lastResultDrawNo: 0,
};

export function loadTelegram(): TelegramSettings {
  return { ...DEFAULT_TELEGRAM, ...read<Partial<TelegramSettings>>(KEYS.telegram, {}) };
}

export function saveTelegram(settings: TelegramSettings): void {
  write(KEYS.telegram, settings);
}

export function loadOpenAiKey(): string {
  return read<{ apiKey?: string }>(KEYS.openai, {}).apiKey?.trim() ?? "";
}

export function saveOpenAiKey(apiKey: string): void {
  write(KEYS.openai, { apiKey: apiKey.trim() });
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

export function loadGameKind(): GameKind {
  const value = read<GameKind>(KEYS.gameKind, "lotto");
  return value === "pension" ? "pension" : "lotto";
}

export function saveGameKind(kind: GameKind): void {
  write(KEYS.gameKind, kind);
}

export function loadExtraPensionDraws(): PensionDraw[] {
  return read<PensionDraw[]>(KEYS.extraPension, []);
}

export function saveExtraPensionDraws(draws: PensionDraw[]): void {
  write(KEYS.extraPension, draws);
}

export function loadSavedPension(): SavedPension[] {
  return read<SavedPension[]>(KEYS.savedPension, []).map((item) => ({
    ...item,
    purchased: Boolean(item.purchased),
  }));
}

export function saveSavedPension(items: SavedPension[]): void {
  write(KEYS.savedPension, items);
}

export function clearAllUserData(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}
