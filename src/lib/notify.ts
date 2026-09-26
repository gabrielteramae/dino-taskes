type DueTask = { id: string; text: string; done: boolean; dueAt: string | null };

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

function once(tag: string, title: string, body: string) {
  const key = `notify:${tag}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    /* still try to show it */
  }
  notifyNow(title, body, tag);
}

export function notifyDue(tasks: DueTask[]) {
  const start = new Date();
  start.setHours(23, 59, 59, 999);
  const due = tasks.filter((task) => {
    if (task.done || !task.dueAt) return false;
    const when = new Date(task.dueAt);
    return !Number.isNaN(when.getTime()) && when.getTime() <= start.getTime();
  });
  if (due.length === 0) return;
  const day = new Date().toISOString().slice(0, 10);
  const names = due.slice(0, 3).map((task) => task.text);
  const extra = due.length > 3 ? ` e mais ${due.length - 3}` : "";
  once(`due:${day}`, due.length === 1 ? "1 tarefa para hoje" : `${due.length} tarefas para hoje`, `${names.join(", ")}${extra}`);
}

export function notifyDone(id: string, text: string) {
  notifyNow("Tarefa concluída", text, `done:${id}`);
}
