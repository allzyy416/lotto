export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${y}년 ${m}월 ${d}일`;
}

export function formatWon(value: number): string {
  if (!value) return "—";
  if (value >= 100_000_000) {
    const eok = value / 100_000_000;
    return `${eok.toFixed(eok >= 10 ? 0 : 1)}억 원`;
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("ko-KR");
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDay();
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function weekKey(date = new Date()): string {
  const tmp = new Date(date);
  tmp.setHours(0, 0, 0, 0);
  const day = tmp.getDay();
  tmp.setDate(tmp.getDate() - day);
  return tmp.toISOString().slice(0, 10);
}
