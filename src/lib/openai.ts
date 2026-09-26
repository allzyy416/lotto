const PROXY_BASE = "/oa-api";

function friendlyOpenAiError(status: number, message?: string): string {
  const text = (message || "").toLowerCase();
  if (status === 401 || text.includes("invalid api key") || text.includes("incorrect api key")) {
    return "OpenAI API 키가 올바르지 않습니다. 키를 다시 확인하세요.";
  }
  if (status === 429 || text.includes("rate limit")) {
    return "OpenAI 요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
  }
  if (text.includes("quota") || text.includes("billing") || text.includes("insufficient")) {
    return "OpenAI 사용 한도 또는 결제 상태를 확인하세요.";
  }
  return message || "GPT 요청에 실패했습니다.";
}

export async function completeJson(apiKey: string, system: string, user: string): Promise<unknown> {
  const res = await fetch(`${PROXY_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  const text = (await res.text()).trim();
  if (!text || text.startsWith("<")) {
    throw new Error("서버에 OpenAI 연결이 없습니다. EC2에서 배포 명령을 실행한 뒤 다시 시도하세요.");
  }
  let payload: {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  try {
    payload = JSON.parse(text) as typeof payload;
  } catch {
    throw new Error("GPT 응답을 읽지 못했습니다. 잠시 후 다시 시도하세요.");
  }
  if (!res.ok || payload.error) {
    throw new Error(friendlyOpenAiError(res.status, payload.error?.message));
  }
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("GPT가 빈 응답을 보냈습니다. 다시 시도하세요.");
  const jsonText = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error("GPT가 JSON 형식으로 답하지 않았습니다. 다시 시도하세요.");
  }
}
