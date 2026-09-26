import { calendarDay, clockOf } from "./dates.ts";

type AgendaTask = {
  id: string;
  text: string;
  dueAt: string | null;
  endsAt: string | null;
};

function compact(day: string) {
  return day.replaceAll("-", "");
}

function nextDay(day: string) {
  const cursor = new Date(`${day}T12:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  return cursor.toISOString().slice(0, 10);
}

function stamp(day: string, clock: string) {
  return `${compact(day)}T${clock.replace(":", "")}00`;
}

export function googleAgendaUrl(task: AgendaTask) {
  const start = calendarDay(task.dueAt);
  const end = calendarDay(task.endsAt) || start;
  if (!start) return null;
  const startClock = clockOf(task.dueAt);
  const endClock = clockOf(task.endsAt) || startClock;
  const dates = startClock
    ? `${stamp(start, startClock)}/${stamp(end, endClock || startClock)}`
    : `${compact(start)}/${compact(nextDay(end))}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: task.text,
    dates,
    details: "Tarefa",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsFor(task: AgendaTask) {
  const start = calendarDay(task.dueAt);
  const end = calendarDay(task.endsAt) || start;
  if (!start) return null;
  const startClock = clockOf(task.dueAt);
  const endClock = clockOf(task.endsAt) || startClock;
  const when = startClock
    ? `DTSTART:${stamp(start, startClock)}\nDTEND:${stamp(end, endClock || startClock)}`
    : `DTSTART;VALUE=DATE:${compact(start)}\nDTEND;VALUE=DATE:${compact(nextDay(end))}`;
  const summary = task.text.replace(/[\\;,]/g, " ").slice(0, 80);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tarefas//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${task.id}@tarefas`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `SUMMARY:${summary}`,
    when,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
}

export function phoneCalendarHref(task: AgendaTask) {
  const start = calendarDay(task.dueAt);
  const end = calendarDay(task.endsAt) || start;
  if (!start) return null;
  const params = new URLSearchParams({ text: task.text, start, end });
  const startClock = clockOf(task.dueAt);
  const endClock = clockOf(task.endsAt);
  if (startClock) params.set("startClock", startClock);
  if (endClock) params.set("endClock", endClock);
  return `/api/agenda?${params.toString()}`;
}

export async function downloadPhoneCalendar(task: AgendaTask) {
  const href = phoneCalendarHref(task);
  const ics = icsFor(task);
  if (!href || !ics || typeof document === "undefined") return;
  const file = new File([ics], "tarefa.ics", { type: "application/octet-stream" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tarefa.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
