import { RANK_LABEL } from "./constants";
import { compareCombo } from "./compare";
import type { Draw, SavedCombo, TelegramSettings } from "../types";

const PROXY_BASE = "/tg-api";

export function telegramReady(settings: TelegramSettings): boolean {
  return Boolean(settings.botToken.trim() && settings.chatId.trim());
}

export function maskToken(token: string): string {
  const value = token.trim();
  if (value.length < 8) return value ? "••••" : "";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function friendlyTelegramError(description?: string): string {
  const text = (description || "").toLowerCase();
  if (text.includes("unauthorized")) {
    return "봇 토큰이 올바르지 않습니다. BotFather에서 다시 확인하세요.";
  }
  if (text.includes("chat not found") || text.includes("chat_id is empty")) {
    return "채팅 ID가 올바르지 않습니다. 숫자 ID를 다시 확인하세요.";
  }
  if (text.includes("blocked") || text.includes("initiate conversation") || text.includes("forbidden")) {
    return "텔레그램에서 이 봇을 열고 시작을 누른 뒤 다시 보내세요.";
  }
  return description || "텔레그램 요청에 실패했습니다.";
}

async function telegramCall(token: string, method: string, body?: Record<string, unknown>) {
  const res = await fetch(`${PROXY_BASE}/bot${token.trim()}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = (await res.text()).trim();
  if (!text || text.startsWith("<")) {
    throw new Error("서버에 텔레그램 연결이 없습니다. EC2에서 배포 명령을 실행한 뒤 다시 시도하세요.");
  }
  let data: { ok: boolean; description?: string; result?: unknown };
  try {
    data = JSON.parse(text) as { ok: boolean; description?: string; result?: unknown };
  } catch {
    throw new Error("텔레그램 응답을 읽지 못했습니다. 잠시 후 다시 시도하세요.");
  }
  if (!data.ok) throw new Error(friendlyTelegramError(data.description));
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
  if (!chatId) throw new Error("텔레그램에서 봇을 열고 아무 말이나 보낸 뒤 다시 시도하세요.");
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
