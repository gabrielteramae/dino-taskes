import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DockNav, type DockTab } from "@/components/dock-nav";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  addTask,
  getStreak,
  listTasks,
  recordClear,
  removeTask,
  reorderTasks,
  setTaskDay,
  toggleTask,
  type TaskRow,
} from "@/lib/tasks";
import { getPrefs } from "@/lib/prefs";
import { notifyDone, notifyDue } from "@/lib/notify";
import { AccountMenu } from "@/components/account-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

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

function isSameDay(iso: string | null, day = new Date()) {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

function formatDue(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function dayValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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
        <p className="mt-1 text-xs text-subtle">Na lista, escolha o dia de uma tarefa. Ela aparece aqui.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
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
          {new Date(`${selected}T12:00:00`).toLocaleDateString("pt-BR", {
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
              <li key={task.id} className="rounded-2xl bg-surface px-4 py-3 text-sm shadow-[0_8px_24px_rgba(60,40,20,0.05)]">
                {task.text}
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
      notifyDue(loaded);
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
      sortOrder: (tasksRef.current[0]?.sortOrder ?? 0) - 1,
    };
    tasksRef.current = [temp, ...tasksRef.current];
    setTasks(tasksRef.current);
    chain(id, async () => {
      const local = tasksRef.current.find((task) => task.id === id);
      if (!local) return;
      try {
        await addTask({
          data: { id, text: local.text, dueAt: local.dueAt, sortOrder: local.sortOrder },
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
    if (willDone && notifyOnDone && current) notifyDone(id, current.text);
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

  const visible = tasks.filter((task) => {
    if (tab === "feitas") return task.done;
    return !task.done;
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
    const dueLabel = formatDue(task.dueAt);
    const overdue = Boolean(task.dueAt && !task.done && new Date(task.dueAt).getTime() < Date.now() && !isSameDay(task.dueAt));
    return (
      <li
        key={task.id}
        data-task-id={task.id}
        className={cn(
          "flex items-center gap-3 rounded-2xl bg-surface px-3 py-3 shadow-[0_8px_24px_rgba(60,40,20,0.05)]",
          dragId === task.id && "opacity-40",
        )}
      >
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
            className="grid size-10 shrink-0 touch-none place-items-center text-subtle"
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void toggle(task.id)}
          aria-label={task.done ? "Desmarcar tarefa" : "Concluir tarefa"}
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors duration-150",
            task.done ? "border-accent bg-accent text-accent-fg" : "border-[#d9d3cb] bg-surface text-transparent",
          )}
        >
          <Check className="size-3.5" strokeWidth={3} />
        </button>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[15px] leading-snug", task.done && "text-subtle line-through")}>
            {emojiForTask(task.text)} {task.text}
          </span>
          {dueLabel ? (
            <span className={cn("mt-0.5 block text-xs", overdue ? "text-danger" : "text-subtle")}>{dueLabel}</span>
          ) : tab === "tarefas" ? (
            <span className="mt-0.5 block text-xs text-subtle">Sem dia</span>
          ) : null}
          {tab === "tarefas" && !task.done ? (
            <label className="mt-2 flex items-center gap-2 text-xs text-subtle">
              Dia
              <input
                type="date"
                aria-label={`Dia de ${task.text}`}
                value={dayValue(task.dueAt)}
                onChange={(event) => schedule(task.id, event.target.value)}
                className="h-8 rounded-lg bg-surface-2 px-2 text-xs text-fg"
              />
            </label>
          ) : null}
        </span>
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            task.priority === "urgente" ? "bg-danger" : task.priority === "depois" ? "bg-accent" : "bg-[#e4b423]",
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
      </li>
    );
  };

  const titles: Record<DockTab, string> = {
    tarefas: "Lista",
    hoje: "Calendário",
    feitas: "Feitas",
  };

  const schedule = async (id: string, day: string) => {
    const dueAt = day ? new Date(`${day}T12:00:00`).toISOString() : null;
    const previous = tasksRef.current.find((task) => task.id === id)?.dueAt ?? null;
    const next = tasksRef.current.map((task) => (task.id === id ? { ...task, dueAt } : task));
    tasksRef.current = next;
    setTasks(next);
    chain(id, async () => {
      const current = tasksRef.current.find((task) => task.id === id)?.dueAt ?? null;
      try {
        await setTaskDay({ data: { id, dueAt: current } });
      } catch (err) {
        if (isUnauthorized(err)) return;
        const restored = tasksRef.current.map((task) => (task.id === id ? { ...task, dueAt: previous } : task));
        tasksRef.current = restored;
        setTasks(restored);
      }
    });
  };

  const agendaGroups = () => {
    const pending = tasks.filter((task) => !task.done);
    const open = pending.filter((task) => !task.dueAt);
    const byDay = new Map<string, TaskRow[]>();
    for (const task of pending) {
      if (!task.dueAt) continue;
      const key = dayValue(task.dueAt);
      if (!key) continue;
      const list = byDay.get(key) ?? [];
      list.push(task);
      byDay.set(key, list);
    }
    return { open, days: [...byDay.keys()].sort() , byDay };
  };

  const today = new Date();
  const doneCount = tasks.filter((task) => task.done).length;
  const progress = tasks.length ? doneCount / tasks.length : 0;

  return (
    <main className="relative min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-8 pb-36">
        <header className="mb-5 flex items-center justify-between gap-3">
          {tab === "tarefas" ? (
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface text-lg font-medium shadow-[0_8px_24px_rgba(60,40,20,0.05)]">
                {today.getDate()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize">
                  {today.toLocaleDateString("pt-BR", { weekday: "long" })}
                </p>
                <p className="text-xs text-muted capitalize">
                  {today.toLocaleDateString("pt-BR", { month: "long" })}
                  {ready ? ` · ${doneCount} de ${tasks.length}` : ""}
                  {streak > 0 ? ` · ${streak} dia${streak === 1 ? "" : "s"}` : ""}
                </p>
                <div className="mt-2 h-1 w-28 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{titles[tab]}</h1>
              <p className="mt-1 text-xs text-subtle">
                {tab === "hoje"
                  ? "Só as tarefas que já têm um dia."
                  : "As que você marcou como feitas."}
              </p>
            </div>
          )}
          <AccountMenu />
        </header>

        {tab === "tarefas" ? (
          <form
            className="mb-6 flex flex-col gap-3"
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

        {tab === "hoje" ? (
          <Agenda groups={agendaGroups()} ready={ready} />
        ) : (
          <ul className="flex flex-col gap-3">
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
      </div>

      <DockNav tab={tab} onChange={setTab} />
    </main>
  );
}
