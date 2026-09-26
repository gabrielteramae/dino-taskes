import { spanDays } from "./dates.ts";

type DueTask = { id: string; text: string; done: boolean; dueAt: string | null; endsAt?: string | null };

export type NotifyFilters = { today: boolean; late: boolean; done: boolean };

export function localDay(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function tasksForFilters(tasks: DueTask[], filters: Pick<NotifyFilters, "today" | "late">, today = localDay()) {
  const picked: DueTask[] = [];
  for (const task of tasks) {
    if (task.done) continue;
    const days = spanDays(task.dueAt, task.endsAt ?? null);
    const end = days[days.length - 1];
    if (!end) continue;
    if (end < today) {
      if (filters.late) picked.push(task);
    } else if (filters.today && days.includes(today)) {
      picked.push(task);
    }
  }
  return picked;
}

export function notificationsSupported() {
  return typeof Notification !== "undefined";
}

export function notifyNow(title: string, body: string, tag: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, tag });
    return true;
  } catch {
    return false;
  }
}

function claim(tag: string) {
  const key = `notify:${tag}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

export function notifyDue(tasks: DueTask[], filters: Pick<NotifyFilters, "today" | "late">) {
  if (!filters.today && !filters.late) return;
  const picked = tasksForFilters(tasks, filters);
  if (picked.length === 0) return;
  const day = localDay();
  if (!claim(`due:${day}:${filters.today ? "h" : ""}${filters.late ? "a" : ""}`)) return;
  const names = picked
    .slice(0, 3)
    .map((task) => task.text)
    .join(", ");
  const extra = picked.length > 3 ? ` e mais ${picked.length - 3}` : "";
  const title = filters.late && !filters.today ? "Tarefas atrasadas" : filters.today && !filters.late ? "Tarefas de hoje" : "Tarefas na agenda";
  notifyNow(title, `${names}${extra}`, `due:${day}`);
}

export function notifyDone(id: string, text: string) {
  notifyNow("Tarefa concluída", text, `done:${id}`);
}
