import { RANK_LABEL } from "./constants";
import { compareCombo } from "./compare";
import type { Draw, SavedCombo, TelegramSettings } from "../types";

const TG_BASE = "/tg-api";

export function telegramReady(settings: TelegramSettings): boolean {
  return Boolean(settings.botToken.trim() && settings.chatId.trim());
}

export function maskToken(token: string): string {
  const value = token.trim();
  if (value.length < 8) return value ? "••••" : "";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

async function telegramCall(token: string, method: string, body?: Record<string, unknown>) {
  const res = await fetch(`${TG_BASE}/bot${token.trim()}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!data.ok) throw new Error(data.description || "텔레그램 요청에 실패했습니다.");
  return data.result;
}

export async function sendTelegram(settings: TelegramSettings, text: string): Promise<void> {
  if (!telegramReady(settings)) throw new Error("봇 토큰과 채팅 ID를 먼저 저장하세요.");
  await telegramCall(settings.botToken, "sendMessage", {
    chat_id: settings.chatId.trim(),
    text,
    disable_web_page_preview: true,
  });
}

export async function fetchChatId(token: string): Promise<string> {
  const result = (await telegramCall(token, "getUpdates")) as { message?: { chat?: { id?: number } } }[];
  const chatId = [...result].reverse().find((row) => row.message?.chat?.id)?.message?.chat?.id;
  if (!chatId) throw new Error("봇에게 먼저 아무 메시지나 보낸 뒤 다시 시도하세요.");
  return String(chatId);
}

function formatNumbers(numbers: number[], bonus?: number): string {
  const main = numbers.map((n) => String(n).padStart(2, "0")).join("  ");
  return bonus == null ? main : `${main}  +  ${String(bonus).padStart(2, "0")}`;
}

export function formatDrawResultMessage(draw: Draw, saved: SavedCombo[]): string {
  const purchased = saved.filter((item) => item.purchased && item.targetDrawNo === draw.drawNo);
  const lines = [
    "ALLZYY LOTTO",
    `${draw.drawNo}회 당첨번호`,
    formatNumbers(draw.numbers, draw.bonus),
    "",
  ];
  if (purchased.length === 0) {
    lines.push("이 회차에 구매로 표시한 번호가 없습니다.");
    return lines.join("\n");
  }
  lines.push("구매 번호와 결과");
  purchased.forEach((item, index) => {
    const result = compareCombo(item.numbers, draw);
    lines.push(
      `${index + 1}) ${formatNumbers(item.numbers)} → ${result.matches}개 · ${RANK_LABEL[result.rank]}`,
    );
  });
  return lines.join("\n");
}

export function formatPurchaseReminderMessage(nextDrawNo: number, saved: SavedCombo[]): string {
  const purchased = saved.filter((item) => item.purchased && item.targetDrawNo === nextDrawNo);
  const lines = ["ALLZYY LOTTO 구매 검토", `다음 회차 ${nextDrawNo}회`, ""];
  if (purchased.length === 0) {
    lines.push("아직 구매로 표시한 번호가 없습니다.");
    lines.push("저장함에서 번호를 검토한 뒤 구매했다면 구매로 표시해 두세요.");
    return lines.join("\n");
  }
  lines.push("구매로 표시한 번호");
  purchased.forEach((item, index) => {
    lines.push(`${index + 1}) ${formatNumbers(item.numbers)}`);
  });
  return lines.join("\n");
}
