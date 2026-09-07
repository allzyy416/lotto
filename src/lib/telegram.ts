import { RANK_LABEL } from "./constants";
import { compareCombo } from "./compare";
import type { Draw, SavedCombo, TelegramSettings } from "../types";

const PROXY_BASE = "/tg-api";
const DIRECT_BASE = "https://api.telegram.org";

export function telegramReady(settings: TelegramSettings): boolean {
  return Boolean(settings.botToken.trim() && settings.chatId.trim());
}

export function maskToken(token: string): string {
  const value = token.trim();
  if (value.length < 8) return value ? "••••" : "";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function parseTelegram(text: string): { ok: boolean; description?: string; result?: unknown } {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("<")) {
    throw new Error("HTML");
  }
  return JSON.parse(trimmed) as { ok: boolean; description?: string; result?: unknown };
}

async function fetchTelegram(url: string, body?: Record<string, unknown>) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = parseTelegram(text);
  if (!data.ok) throw new Error(data.description || "텔레그램 요청에 실패했습니다.");
  return data.result;
}

function queryUrl(base: string, token: string, method: string, params?: Record<string, unknown>) {
  const qs = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null) qs.set(key, String(value));
    }
  }
  const query = qs.toString();
  return `${base}/bot${token.trim()}/${method}${query ? `?${query}` : ""}`;
}

async function sendOpaque(url: string): Promise<void> {
  try {
    await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store" });
  } catch {
    await new Promise<void>((resolve) => {
      const img = new Image();
      const done = () => resolve();
      img.onload = done;
      img.onerror = done;
      img.src = url;
      window.setTimeout(done, 2000);
    });
  }
}

async function telegramCall(token: string, method: string, body?: Record<string, unknown>) {
  const clean = token.trim();
  try {
    return await fetchTelegram(queryUrl(PROXY_BASE, clean, method), body);
  } catch {
    try {
      return await fetchTelegram(queryUrl(DIRECT_BASE, clean, method), body);
    } catch {
      if (method === "sendMessage" && body) {
        await sendOpaque(queryUrl(DIRECT_BASE, clean, method, body));
        return undefined;
      }
      if (method === "getUpdates") {
        throw new Error("채팅 ID는 입력칸에 직접 넣으면 됩니다. 봇에게 말을 건 뒤 @userinfobot에서 숫자 ID를 확인하세요.");
      }
      throw new Error("텔레그램에 연결하지 못했습니다. 토큰과 채팅 ID를 다시 확인하세요.");
    }
  }
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
