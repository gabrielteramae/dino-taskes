type DueTask = { id: string; text: string; done: boolean; dueAt: string | null; endsAt?: string | null };

export function notificationsSupported() {
  return typeof Notification !== "undefined";
}

export function notifyNow(_title: string, _body: string, _tag: string) {
  return false;
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

export function notifyDue(tasks: DueTask[]) {
  const start = new Date();
  start.setHours(23, 59, 59, 999);
  const due = tasks.filter((task) => {
    if (task.done) return false;
    const begin = task.dueAt ? new Date(task.dueAt) : null;
    const finish = task.endsAt ? new Date(task.endsAt) : begin;
    if (!finish || Number.isNaN(finish.getTime())) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const beginMs = begin && !Number.isNaN(begin.getTime()) ? begin.getTime() : finish.getTime();
    return beginMs <= start.getTime() && finish.getTime() >= startOfToday.getTime() || finish.getTime() < startOfToday.getTime();
  });
  if (due.length === 0) return null;
  const day = new Date().toISOString().slice(0, 10);
  const names = due.slice(0, 3).map((task) => task.text);
  const extra = due.length > 3 ? ` e mais ${due.length - 3}` : "";
  const title = due.length === 1 ? "1 tarefa para hoje" : `${due.length} tarefas para hoje`;
  const body = `${names.join(", ")}${extra}`;
  if (!claim(`due:${day}`)) return null;
  notifyNow(title, body, `due:${day}`);
  return { title, body };
}

export function notifyDone(id: string, text: string) {
  notifyNow("Tarefa concluída", text, `done:${id}`);
}
