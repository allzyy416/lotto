import type { AlertSettings } from "../types";
import { WEEKDAYS } from "./constants";
import { pad2, weekKey } from "./format";

export async function requestNotifyPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function canNotify(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

export function reminderDue(settings: AlertSettings, now = new Date()): boolean {
  if (!settings.enabled) return false;
  if (now.getDay() !== settings.weekday) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const target = settings.hour * 60 + settings.minute;
  if (minutes < target) return false;
  return settings.lastNotifiedWeek !== weekKey(now);
}

export function showPurchaseReminder(nextDrawNo: number): void {
  const title = "ALLZYY LOTTO 번호 검토 알림";
  const body = `${nextDrawNo}회 추첨 전, 저장한 번호를 한 번 더 살펴보세요. 알림은 당첨을 보장하지 않으며 구매를 권유하지 않습니다.`;
  if (canNotify()) {
    new Notification(title, { body, silent: false });
  }
}

export function scheduleLabel(settings: AlertSettings): string {
  return `매주 ${WEEKDAYS[settings.weekday]}요일 ${pad2(settings.hour)}:${pad2(settings.minute)}`;
}
