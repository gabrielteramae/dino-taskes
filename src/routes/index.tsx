import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DockNav, type DockTab } from "@/components/dock-nav";
import { PhoneScroll } from "@/components/phone-scroll";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addTask,
  getStreak,
  listTasks,
  recordClear,
  removeTask,
  reorderTasks,
  setTaskSpan,
  toggleTask,
  type TaskRow,
} from "@/lib/tasks";
import { getPrefs } from "@/lib/prefs";
import { notifyDone, notifyDue } from "@/lib/notify";
import { sendUserPush } from "@/lib/push";
import { AccountMenu } from "@/components/account-menu";
import { cn } from "@/lib/utils";
import { calendarDay, clockOf, formatRange, spanDays, withClock } from "@/lib/dates";
import { downloadPhoneCalendar, googleAgendaUrl, phoneCalendarHref } from "@/lib/agenda";

const STOP_WORDS = new Set([
  "para", "com", "uma", "uns", "umas", "que", "das", "dos", "por", "nao", "ate", "dia", "dias",
  "tarefa", "fazer", "hoje", "amanha", "depois", "antes", "sobre", "entre", "pelo", "pela",
]);

function similarFilters(tasks: TaskRow[]) {
  const counts = new Map<string, string[]>();
  for (const task of tasks) {
    if (task.done) continue;
    const seen = new Set<string>();
    const words = task.text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
    for (const word of words) {
      if (seen.has(word)) continue;
      seen.add(word);
      const ids = counts.get(word) ?? [];
      ids.push(task.id);
      counts.set(word, ids);
    }
  }
  return [...counts.entries()]
    .filter(([, ids]) => ids.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([word, ids]) => ({
      id: word,
      label: word.charAt(0).toUpperCase() + word.slice(1),
      ids: new Set(ids),
    }));
}

const EMOJI_RULES: Array<{ keys: string[]; emoji: string }> = [
  { keys: ["cafe", "coffee"], emoji: "☕" },
  { keys: ["agua", "beber"], emoji: "💧" },
  { keys: ["comer", "almoco", "jantar", "lanche", "comida"], emoji: "🍽️" },
  { keys: ["comprar", "mercado", "feira", "loja"], emoji: "🛒" },
  { keys: ["estud", "prova", "licao"], emoji: "📚" },
  { keys: ["ler", "livro"], emoji: "📖" },
  { keys: ["treino", "academia", "correr", "exerc"], emoji: "💪" },
  { keys: ["trabalh", "reuniao", "escritorio"], emoji: "💼" },
  { keys: ["email", "e-mail", "mensagem"], emoji: "✉️" },
  { keys: ["ligar", "telefone", "call"], emoji: "📞" },
  { keys: ["limpar", "lavar", "casa", "arrumar"], emoji: "🧹" },
  { keys: ["dormir", "sono", "cama"], emoji: "😴" },
  { keys: ["medico", "dentista", "consulta"], emoji: "🩺" },
  { keys: ["pagar", "conta", "boleto", "banco"], emoji: "💳" },
  { keys: ["anivers", "festa"], emoji: "🎉" },
  { keys: ["viagem", "viajar", "aeroporto"], emoji: "✈️" },
  { keys: ["carro", "dirigir", "uber"], emoji: "🚗" },
  { keys: ["cachorro", "gato", "pet"], emoji: "🐾" },
  { keys: ["planta", "regar"], emoji: "🌱" },
  { keys: ["musica", "tocar"], emoji: "🎵" },
  { keys: ["filme", "serie", "netflix"], emoji: "🎬" },
  { keys: ["codigo", "program", "github"], emoji: "💻" },
];

function emojiForTask(text: string) {
  const n = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const rule of EMOJI_RULES) {
    if (rule.keys.some((k) => n.includes(k))) return rule.emoji;
  }
  return "📝";
}

function isUnauthorized(err: unknown) {
  return err instanceof Error && err.message === "Unauthorized";
}

function isoDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function Agenda({
  groups,
  ready,
}: {
  groups: { open: TaskRow[]; days: string[]; byDay: Map<string, TaskRow[]> };
  ready: boolean;
}) {
  const today = new Date();
  const todayKey = isoDay(today);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(todayKey);
  const week = ["S", "T", "Q", "Q", "S", "S", "D"];
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const pad = (first.getDay() + 6) % 7;
  const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: Array<{ key: string; day: number } | null> = [
    ...Array.from({ length: pad }, () => null),
    ...Array.from({ length: count }, (_, index) => {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), index + 1);
      return { key: isoDay(date), day: index + 1 };
    }),
  ];
  const selectedTasks = [...(groups.byDay.get(selected) ?? [])];

  if (ready && groups.days.length === 0 && groups.open.length === 0) {
    return (
      <div className="rounded-3xl bg-surface px-5 py-10 text-center shadow-[0_8px_24px_rgba(60,40,20,0.05)]">
        <p className="text-sm text-muted">Nada no calendário</p>
        <p className="mt-1 text-xs text-subtle">Na lista, escolha de que dia até que dia. Ela aparece aqui.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-28">
      <section className="rounded-3xl bg-surface px-4 py-4 shadow-[0_8px_24px_rgba(60,40,20,0.05)]">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" className="px-2 text-lg text-muted" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Mês anterior">
            ‹
          </button>
          <p className="text-sm font-medium capitalize">
            {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
          <button type="button" className="px-2 text-lg text-muted" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Próximo mês">
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-2 text-center text-[11px] text-subtle">
          {week.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
          {cells.map((cell, index) =>
            cell ? (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelected(cell.key)}
                className="flex flex-col items-center py-1"
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-sm",
                    selected === cell.key && "bg-accent text-accent-fg",
                    selected !== cell.key && cell.key === todayKey && "text-accent",
                  )}
                >
                  {cell.day}
                </span>
                <span className={cn("mt-0.5 size-1 rounded-full", groups.byDay.has(cell.key) ? "bg-accent" : "bg-transparent")} />
              </button>
            ) : (
              <span key={`empty-${index}`} />
            ),
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium text-fg">
          {selected === todayKey
            ? "Tarefas de hoje"
            : new Date(`${selected}T12:00:00`).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
        </h2>
        <p className="mb-3 text-xs text-subtle">O dia se escolhe na lista, não aqui.</p>
        {selectedTasks.length === 0 ? (
          <p className="text-sm text-subtle">Nada neste dia.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-sm shadow-[0_8px_24px_rgba(60,40,20,0.05)]">
                <span className="min-w-0 truncate">{task.text}</span>
                {googleAgendaUrl(task) ? (
                  <a href={googleAgendaUrl(task) ?? "#"} className="shrink-0 text-xs text-accent">
                    Agenda
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      {groups.open.length > 0 ? (
        <p className="text-xs text-subtle">
          {groups.open.length} sem dia. Escolha o dia na lista para {groups.open.length === 1 ? "ela aparecer" : "elas aparecerem"} aqui.
        </p>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <main className="min-h-dvh bg-bg px-5 pt-10">
        <div className="mx-auto h-40 w-full max-w-lg animate-pulse rounded-2xl bg-surface" />
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <TaskBoard />;
}

function TaskBoard() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notifyOnDone, setNotifyOnDone] = useState(true);
  const [tab, setTab] = useState<DockTab>("tarefas");
  const [streak, setStreak] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const orderRef = useRef<string[] | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const tails = useRef(new Map<string, Promise<void>>());

  const chain = (id: string, job: () => Promise<void>) => {
    const prev = tails.current.get(id) ?? Promise.resolve();
    const next = prev.then(job).catch(() => undefined);
    tails.current.set(id, next);
  };

  useEffect(() => {
    let cancelled = false;
    let loaded: TaskRow[] | null = null;
    let remind = false;
    const ping = () => {
      if (cancelled || !loaded || !remind) return;
      const summary = notifyDue(loaded);
      if (summary) void sendUserPush({ data: summary }).catch(() => undefined);
    };
    listTasks()
      .then((rows) => {
        if (cancelled) return;
        setTasks(rows);
        loaded = rows;
        ping();
      })
      .catch((err) => {
        if (isUnauthorized(err) || cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    void getPrefs()
      .then((p) => {
        if (cancelled) return;
        setConfirmDelete(p.confirmDelete);
        setDisplayName(p.displayName);
        setNotifyOnDone(p.notifyDone);
        remind = p.notifyDino;
        ping();
      })
      .catch(() => undefined);
    void getStreak()
      .then((row) => {
        if (!cancelled) setStreak(row.streak);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const add = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const id = crypto.randomUUID();
    const temp: TaskRow = {
      id,
      text,
      done: false,
      category: "estudo",
      priority: "normal",
      dueAt: null,
      endsAt: null,
      sortOrder: (tasksRef.current[0]?.sortOrder ?? 0) - 1,
    };
    tasksRef.current = [temp, ...tasksRef.current];
    setTasks(tasksRef.current);
    chain(id, async () => {
      const local = tasksRef.current.find((task) => task.id === id);
      if (!local) return;
      try {
        await addTask({
          data: { id, text: local.text, category: local.category, dueAt: local.dueAt, sortOrder: local.sortOrder },
        });
      } catch (err) {
        if (isUnauthorized(err)) return;
        if (!tasksRef.current.some((task) => task.id === id)) return;
        tasksRef.current = tasksRef.current.filter((task) => task.id !== id);
        setTasks(tasksRef.current);
        setDraft(text);
      }
    });
  };

  const toggle = async (id: string) => {
    const current = tasksRef.current.find((task) => task.id === id);
    const willDone = !current?.done;
    const next = tasksRef.current.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
    tasksRef.current = next;
    setTasks(next);
    if (willDone && notifyOnDone && current) {
      notifyDone(id, current.text);
      void sendUserPush({ data: { title: "Tarefa concluída", body: current.text } }).catch(() => undefined);
    }
    chain(id, async () => {
      const desired = tasksRef.current.find((task) => task.id === id)?.done;
      if (desired === undefined) return;
      try {
        let row = await toggleTask({ data: { id } });
        if (row.done !== desired) row = await toggleTask({ data: { id } });
        if (desired && tasksRef.current.every((task) => task.done)) {
          const cleared = await recordClear().catch(() => null);
          if (cleared) setStreak(cleared.streak);
        }
      } catch (err) {
        if (isUnauthorized(err)) return;
        const rows = await listTasks().catch(() => null);
        if (rows) {
          tasksRef.current = rows;
          setTasks(rows);
        }
      }
    });
  };

  const remove = async (id: string) => {
    if (confirmDelete && !window.confirm("Apagar esta tarefa?")) return;
    const snapshot = tasksRef.current;
    const next = snapshot.filter((task) => task.id !== id);
    tasksRef.current = next;
    setTasks(next);
    chain(id, async () => {
      try {
        await removeTask({ data: { id } });
      } catch (err) {
        if (isUnauthorized(err)) return;
        const rows = await listTasks().catch(() => null);
        if (rows) {
          tasksRef.current = rows;
          setTasks(rows);
        } else {
          tasksRef.current = snapshot;
          setTasks(snapshot);
        }
      }
    });
  };

  const filters = similarFilters(tasks);
  const active = filters.find((item) => item.id === group) ?? null;
  const visible = tasks.filter((task) => {
    if (tab === "feitas") return task.done;
    if (task.done) return false;
    if (query.trim() && !task.text.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (active && !active.ids.has(task.id)) return false;
    return true;
  });

  const persistOrder = async (ids: string[]) => {
    try {
      await Promise.all([...tails.current.values()]);
      await reorderTasks({ data: { ids } });
    } catch (err) {
      if (isUnauthorized(err)) return;
    }
  };

  const moveBefore = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const prev = tasksRef.current;
    const pending = prev.filter((task) => !task.done);
    const done = prev.filter((task) => task.done);
    const from = pending.findIndex((task) => task.id === fromId);
    const to = pending.findIndex((task) => task.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...pending];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    const ordered = [...next, ...done].map((task, index) => ({ ...task, sortOrder: index }));
    tasksRef.current = ordered;
    orderRef.current = ordered.map((task) => task.id);
    setTasks(ordered);
  };

  const renderTask = (task: TaskRow) => {
    const dueLabel = formatRange(task.dueAt, task.endsAt);
    const end = task.endsAt ?? task.dueAt;
    const endDay = calendarDay(end);
    const overdue = Boolean(endDay && !task.done && endDay < isoDay(new Date()));
    return (
      <li
        key={task.id}
        data-task-id={task.id}
        className={cn(
          "overflow-hidden rounded-2xl border-l-4 bg-surface px-3 py-3 shadow-[0_8px_24px_rgba(60,40,20,0.05)]",
          task.priority === "urgente" ? "border-danger" : task.priority === "depois" ? "border-accent" : "border-[#e4b423]",
          dragId === task.id && "opacity-40",
        )}
      >
        <div className="flex items-center gap-1">
        {tab === "tarefas" && !task.done ? (
          <button
            type="button"
            aria-label="Arrastar para reordenar"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              dragIdRef.current = task.id;
              setDragId(task.id);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const id = dragIdRef.current;
              if (id !== task.id) return;
              const pending = tasksRef.current.filter((item) => !item.done);
              const index = pending.findIndex((item) => item.id === id);
              if (index < 0) return;
              const rows = document.querySelectorAll<HTMLElement>("[data-task-id]");
              const mine = [...rows].find((row) => row.dataset.taskId === id);
              if (!mine) return;
              const mineBox = mine.getBoundingClientRect();
              const goingUp = event.clientY < mineBox.top + mineBox.height / 2;
              const neighbor = pending[goingUp ? index - 1 : index + 1];
              if (!neighbor) return;
              const other = [...rows].find((row) => row.dataset.taskId === neighbor.id);
              if (!other) return;
              const mid = other.getBoundingClientRect().top + other.getBoundingClientRect().height / 2;
              if ((goingUp && event.clientY < mid) || (!goingUp && event.clientY > mid)) {
                moveBefore(id, neighbor.id);
              }
            }}
            onPointerUp={() => {
              dragIdRef.current = null;
              if (orderRef.current) void persistOrder(orderRef.current);
              orderRef.current = null;
              setDragId(null);
            }}
            onPointerCancel={() => {
              dragIdRef.current = null;
              setDragId(null);
            }}
            className="grid size-11 shrink-0 touch-none place-items-center text-subtle"
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void toggle(task.id)}
          aria-label={task.done ? "Desmarcar tarefa" : "Concluir tarefa"}
          className="grid size-11 shrink-0 place-items-center"
        >
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-md border",
              task.done ? "border-accent bg-accent text-accent-fg" : "border-[#d9d3cb] bg-surface text-transparent",
            )}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        </button>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[15px] leading-snug", task.done && "text-subtle line-through")}>
            {task.text}
          </span>
          <span className={cn("mt-0.5 block text-xs", overdue ? "text-danger" : "text-subtle")}>
            {dueLabel || "Sem período"}
          </span>
        </span>
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            task.done ? "bg-accent" : task.priority === "urgente" ? "bg-danger" : task.priority === "depois" ? "bg-accent" : "bg-[#e4b423]",
          )}
          aria-hidden="true"
        />
        <Button
          variant="danger"
          className="h-10 min-w-10 px-2"
          aria-label="Apagar tarefa"
          onClick={() => void remove(task.id)}
        >
          <Trash2 className="size-4" />
        </Button>
        </div>
        {tab === "tarefas" && !task.done ? (
          <div className="mt-3 grid grid-cols-1 gap-2">
            <label className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_6.5rem] items-center gap-2 text-xs text-subtle">
              De
              <input
                type="date"
                aria-label={`Começo de ${task.text}`}
                value={calendarDay(task.dueAt)}
                onChange={(event) => spanChange(task, "start", event.target.value)}
                className="task-date"
              />
              <input
                type="time"
                aria-label={`Hora de começo de ${task.text}`}
                value={clockOf(task.dueAt)}
                disabled={!calendarDay(task.dueAt)}
                onChange={(event) => spanChange(task, "startClock", event.target.value)}
                className="task-date"
              />
            </label>
            <label className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_6.5rem] items-center gap-2 text-xs text-subtle">
              Até
              <input
                type="date"
                aria-label={`Fim de ${task.text}`}
                value={calendarDay(task.endsAt ?? task.dueAt)}
                onChange={(event) => spanChange(task, "end", event.target.value)}
                className="task-date"
              />
              <input
                type="time"
                aria-label={`Hora de fim de ${task.text}`}
                value={clockOf(task.endsAt)}
                disabled={!calendarDay(task.endsAt ?? task.dueAt)}
                onChange={(event) => spanChange(task, "endClock", event.target.value)}
                className="task-date"
              />
            </label>
            {calendarDay(task.dueAt) ? (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={googleAgendaUrl(task) ?? "#"}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-surface-2 px-2 text-center text-xs text-fg"
                >
                  Google Agenda
                </a>
                <a
                  href={phoneCalendarHref(task) ?? "#"}
                  download="tarefa.ics"
                  onClick={(event) => {
                    event.preventDefault();
                    void downloadPhoneCalendar(task).then(() => {
                      toast("Arquivo salvo. Abra no app Calendário.");
                    });
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-surface-2 px-2 text-center text-xs text-fg"
                >
                  Calendário
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </li>
    );
  };

  const spanChange = (task: TaskRow, which: "start" | "end" | "startClock" | "endClock", value: string) => {
    let start = calendarDay(task.dueAt);
    let end = calendarDay(task.endsAt ?? task.dueAt);
    let startClock = clockOf(task.dueAt);
    let endClock = clockOf(task.endsAt);
    if (which === "start") start = value;
    else if (which === "end") end = value;
    else if (which === "startClock") startClock = value;
    else endClock = value;
    if (start && end && end < start) {
      if (which === "start") end = start;
      else if (which === "end") start = end;
    }
    if (!start && end) start = end;
    if (start && !end) end = start;
    const startAt = start ? withClock(start, startClock) : null;
    const endAt = end ? withClock(end, endClock) : null;
    const previous = tasksRef.current.find((item) => item.id === task.id);
    const next = tasksRef.current.map((item) => (item.id === task.id ? { ...item, dueAt: startAt, endsAt: endAt } : item));
    tasksRef.current = next;
    setTasks(next);
    chain(task.id, async () => {
      try {
        await setTaskSpan({ data: { id: task.id, startAt, endAt } });
      } catch (err) {
        if (isUnauthorized(err) || !previous) return;
        const restored = tasksRef.current.map((item) => (item.id === task.id ? previous : item));
        tasksRef.current = restored;
        setTasks(restored);
      }
    });
  };

  const titles: Record<DockTab, string> = {
    tarefas: "Lista",
    hoje: "Calendário",
    feitas: "Feitas",
  };

  const agendaGroups = () => {
    const pending = tasks.filter((task) => !task.done);
    const open = pending.filter((task) => !task.dueAt && !task.endsAt);
    const byDay = new Map<string, TaskRow[]>();
    for (const task of pending) {
      for (const key of spanDays(task.dueAt, task.endsAt)) {
        const list = byDay.get(key) ?? [];
        list.push(task);
        byDay.set(key, list);
      }
    }
    return { open, days: [...byDay.keys()].sort(), byDay };
  };

  const today = new Date();
  const openCount = tasks.filter((task) => !task.done).length;
  const hour = today.getHours();
  const hello = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = displayName.trim().split(" ")[0];

  return (
    <main className="app-frame text-fg">
      <div className="app-shell mx-auto w-full max-w-lg">
        <header className="mb-5 flex shrink-0 items-center justify-between gap-3">
          {tab === "tarefas" ? (
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">
                {hello}
                {firstName ? `, ${firstName}` : ""}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {ready ? `${openCount} para fazer` : "Carregando…"}
                {streak > 0 ? ` · ${streak} dia${streak === 1 ? "" : "s"}` : ""}
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{titles[tab]}</h1>
              <p className="mt-1 text-xs text-subtle">
                {tab === "hoje"
                  ? "O período de cada tarefa aparece nos dias."
                  : "As que você marcou como feitas."}
              </p>
            </div>
          )}
          <AccountMenu />
        </header>

        {tab === "tarefas" ? (
          <form
            className="mb-6 flex shrink-0 flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void add();
            }}
          >
            <div className="flex gap-3">
              <Input
                value={draft}
                maxLength={80}
                onChange={(event) => setDraft(event.target.value)}
                id="nova-tarefa"
                placeholder="O que precisa ser feito?"
                aria-label="Nova tarefa"
              />
              <Button type="submit" aria-label="Adicionar tarefa" className="shrink-0">
                <Plus className="size-5" strokeWidth={2} />
              </Button>
            </div>
          </form>
        ) : null}

        {tab === "tarefas" ? (
          <div className="mb-4 flex shrink-0 flex-col gap-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar tarefa"
              aria-label="Buscar tarefa"
            />
            {filters.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {filters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGroup(group === item.id ? null : item.id)}
                    className={cn(
                      "min-h-11 rounded-full px-3 text-xs",
                      group === item.id ? "bg-fg text-bg" : "bg-surface text-muted",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "feitas" ? (
          <div className="mb-4 grid shrink-0 grid-cols-3 gap-2">
            {(
              [
                ["Feitas", String(tasks.filter((task) => task.done).length)],
                ["Seguidos", String(streak)],
                ["Taxa", tasks.length ? `${Math.round((tasks.filter((task) => task.done).length / tasks.length) * 100)}%` : "0%"],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-surface px-3 py-3 shadow-[0_8px_24px_rgba(60,40,20,0.05)]">
                <p className="text-lg font-semibold">{value}</p>
                <p className="text-[11px] text-subtle">{label}</p>
              </div>
            ))}
          </div>
        ) : null}

        <PhoneScroll>
          {tab === "hoje" ? (
            <Agenda groups={agendaGroups()} ready={ready} />
          ) : (
            <ul className="flex flex-col gap-3 pb-28">
              {ready && visible.length === 0 ? (
                <li className="rounded-xl border border-border bg-surface px-5 py-10 text-center">
                  <p className="text-sm text-muted">Nada por aqui</p>
                  <p className="mt-1 text-xs text-subtle">
                    {tab === "tarefas" ? "Escreve acima. O dia, se quiser, fica em cada tarefa." : "Quando concluir uma da lista, ela vem para cá."}
                  </p>
                </li>
              ) : (
                visible.map(renderTask)
              )}
            </ul>
          )}
        </PhoneScroll>
      </div>

      <DockNav tab={tab} onChange={setTab} />
    </main>
  );
}
