export function calendarDay(iso: string | null | undefined) {
  if (!iso) return "";
  const match = iso.match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

export function noonUtc(day: string) {
  return `${day}T12:00:00.000Z`;
}

export function formatDayLabel(iso: string | null) {
  const day = calendarDay(iso);
  if (!day) return null;
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return null;
  return new Date(year, month - 1, date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatRange(startIso: string | null, endIso: string | null) {
  const start = formatDayLabel(startIso);
  const end = formatDayLabel(endIso);
  if (!start) return null;
  if (!end || start === end) return start;
  return `${start} – ${end}`;
}

export function spanDays(startIso: string | null, endIso: string | null) {
  const start = calendarDay(startIso);
  const end = calendarDay(endIso) || start;
  if (!start) return [] as string[];
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const days: string[] = [];
  const cursor = new Date(`${from}T12:00:00Z`);
  const last = new Date(`${to}T12:00:00Z`);
  while (cursor.getTime() <= last.getTime() && days.length < 400) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function isSameCalendarDay(iso: string | null, day = new Date()) {
  const key = calendarDay(iso);
  if (!key) return false;
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return key === `${day.getFullYear()}-${month}-${date}`;
}
