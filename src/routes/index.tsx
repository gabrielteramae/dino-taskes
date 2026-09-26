import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DinoCompanion, type DinoMood } from "@/components/dino-companion";
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
import { AccountMenu } from "@/components/account-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

const LINES = {
  hello: [
    "Oi! Eu sou o fantasma. Clica em mim ou me arrasta.",
    "Bora organizar o dia? Eu fico de olho.",
  ],
  add: ["Anotado. Vamos nessa.", "Boa. Mais uma na lista.", "Deixa comigo, eu lembro."],
  done: ["Mandou bem.", "Riscou! Continua assim.", "Isso. Uma a menos."],
  allDone: ["Lista zerada. Merece um descanso.", "Tudo feito. Eu também vou cochilar."],
  remove: ["Tirei. Sem problema.", "Ok, essa saiu da lista."],
  pet: ["Hehe. Faz cócegas.", "Gostei. De novo?", "Sou só um fantasma fofo mesmo."],
  think: ["Hmm, o que vem agora?", "Escreve, eu estou prestando atenção."],
  idle: [
    "Se quiser, me arrasta pelo canto da tela.",
    "Marca as tarefas. Eu comemoro cada uma.",
    "Estou aqui se precisar.",
  ],
  sleep: ["Zz… me chama se precisar.", "Cochilando. Clica em mim."],
};

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

function pick(list: string[]) {
  return list[Math.floor(Math.random() * list.length)] ?? list[0] ?? "";
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

function Agenda({
  tasks,
  groups,
  onDay,
  ready,
}: {
  tasks: TaskRow[];
  groups: { open: TaskRow[]; days: string[]; byDay: Map<string, TaskRow[]> };
  onDay: (id: string, day: string) => void;
  ready: boolean;
}) {
  if (ready && tasks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-5 py-10 text-center">
        <p className="text-sm text-muted">Nenhuma tarefa ainda</p>
        <p className="mt-1 text-xs text-subtle">Adiciona na aba Tarefas e escolhe o dia aqui.</p>
      </div>
    );
  }

  const row = (task: TaskRow) => (
    <li key={task.id} className="rounded-xl border border-border bg-surface px-3 py-3">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-base leading-none" aria-hidden="true">
          {emojiForTask(task.text)}
        </span>
        <span className="min-w-0 flex-1 text-sm leading-snug">{task.text}</span>
      </div>
      <input
        type="date"
        aria-label={`Dia de ${task.text}`}
        value={dayValue(task.dueAt)}
        onChange={(event) => onDay(task.id, event.target.value)}
        className="mt-3 h-12 w-full rounded-lg border border-border bg-surface-2 px-3 text-base text-fg"
      />
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      {groups.open.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">Sem dia</h2>
          <ul className="flex flex-col gap-3">{groups.open.map(row)}</ul>
        </section>
      ) : null}
      {groups.days.map((day) => (
        <section key={day}>
          <h2 className="mb-3 text-sm font-medium text-muted">
            {new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", {
              weekday: "short",
              day: "2-digit",
              month: "short",
            })}
          </h2>
          <ul className="flex flex-col gap-3">{groups.byDay.get(day)?.map(row)}</ul>
        </section>
      ))}
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
  const [mood, setMood] = useState<DinoMood>("wave");
  const [message, setMessage] = useState(LINES.hello[0]!);
  const [dinoTalks, setDinoTalks] = useState(true);
  const [dinoSmall, setDinoSmall] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notifyDone, setNotifyDone] = useState(true);
  const [notifyDino, setNotifyDino] = useState(true);
  const [tab, setTab] = useState<DockTab>("tarefas");
  const [streak, setStreak] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const idleTimer = useRef<number | null>(null);
  const sleepTimer = useRef<number | null>(null);
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

  const speak = (nextMood: DinoMood, nextMessage: string) => {
    setMood(nextMood);
    setMessage(dinoTalks ? nextMessage : "");
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    if (sleepTimer.current) window.clearTimeout(sleepTimer.current);
    if (!notifyDino) return;
    idleTimer.current = window.setTimeout(() => {
      setMood("idle");
      setMessage(dinoTalks ? pick(LINES.idle) : "");
    }, 4200);
    sleepTimer.current = window.setTimeout(() => {
      setMood("sleep");
      setMessage(dinoTalks ? pick(LINES.sleep) : "");
    }, 18000);
  };

  useEffect(() => {
    let cancelled = false;
    listTasks()
      .then((rows) => {
        if (cancelled) return;
        setTasks(rows);
        if (rows.some((task) => !task.done && (isSameDay(task.dueAt) || (task.dueAt && new Date(task.dueAt) < new Date())))) {
          speak("think", "Tem coisa pra hoje. Não esquece.");
        }
      })
      .catch((err) => {
        if (isUnauthorized(err) || cancelled) return;
        speak("think", "Não consegui carregar agora.");
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    void getPrefs()
      .then((p) => {
        if (cancelled) return;
        setDinoTalks(p.dinoTalks);
        setDinoSmall(p.dinoSmall);
        setConfirmDelete(p.confirmDelete);
        setNotifyDone(p.notifyDone);
        setNotifyDino(p.notifyDino);
      })
      .catch(() => undefined);
    void getStreak()
      .then((row) => {
        if (!cancelled) setStreak(row.streak);
      })
      .catch(() => undefined);
    speak("wave", pick(LINES.hello));
    return () => {
      cancelled = true;
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      if (sleepTimer.current) window.clearTimeout(sleepTimer.current);
    };
  }, []);

  const remaining = useMemo(() => tasks.filter((t) => !t.done).length, [tasks]);

  const add = async () => {
    const text = draft.trim();
    if (!text) {
      speak("think", "Escreve alguma coisa primeiro.");
      return;
    }
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
    speak("celebrate", pick(LINES.add));
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
        speak("shy", "Essa não entrou. Tenta de novo.");
      }
    });
  };

  const toggle = async (id: string) => {
    const current = tasks.find((t) => t.id === id);
    const willDone = !current?.done;
    const left = tasks.filter((t) => (t.id === id ? !willDone : !t.done)).length;
    const next = tasksRef.current.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
    tasksRef.current = next;
    setTasks(next);
    if (willDone && left === 0) speak("celebrate", pick(LINES.allDone));
    else if (willDone) speak("celebrate", notifyDone ? pick(LINES.done) : "");
    else speak("think", "Voltou pra lista. Sem pressa.");
    chain(id, async () => {
      const desired = tasksRef.current.find((task) => task.id === id)?.done;
      if (desired === undefined) return;
      try {
        let row = await toggleTask({ data: { id } });
        if (row.done !== desired) row = await toggleTask({ data: { id } });
        if (desired && tasksRef.current.every((task) => task.done)) {
          const cleared = await recordClear().catch(() => null);
          if (cleared) setStreak(cleared.streak);
          if (cleared && cleared.streak > 1) speak("celebrate", `Lista zerada. ${cleared.streak} dias seguidos.`);
        }
      } catch (err) {
        if (isUnauthorized(err)) return;
        const rows = await listTasks().catch(() => null);
        if (rows) {
          tasksRef.current = rows;
          setTasks(rows);
        }
        speak("shy", "Não rolou agora.");
      }
    });
  };

  const remove = async (id: string) => {
    if (confirmDelete && !window.confirm("Apagar esta tarefa?")) return;
    const snapshot = tasksRef.current;
    const next = snapshot.filter((task) => task.id !== id);
    tasksRef.current = next;
    setTasks(next);
    speak("shy", pick(LINES.remove));
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
        speak("think", "Não consegui apagar.");
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
      speak("think", "Não consegui reordenar.");
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
          "flex items-center gap-2 rounded-xl border border-border bg-surface py-3 pr-2 pl-2",
          task.done && "opacity-60",
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
            "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors duration-150",
            task.done
              ? "border-accent bg-accent text-accent-fg"
              : "border-border bg-surface-2 text-transparent hover:border-accent/50",
          )}
        >
          <Check className="size-3.5" strokeWidth={3} />
        </button>
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-base leading-none"
          aria-hidden="true"
        >
          {emojiForTask(task.text)}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm leading-snug", task.done && "text-subtle line-through")}>
            {task.text}
          </span>
          {dueLabel ? (
            <span className={cn("mt-1 block text-xs", overdue ? "text-danger" : "text-subtle")}>{dueLabel}</span>
          ) : null}
        </span>
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
    tarefas: "Tarefas",
    hoje: "Agenda",
    feitas: "Feitas",
  };

  const schedule = async (id: string, day: string) => {
    const dueAt = day ? new Date(`${day}T12:00:00`).toISOString() : null;
    const previous = tasksRef.current.find((task) => task.id === id)?.dueAt ?? null;
    const next = tasksRef.current.map((task) => (task.id === id ? { ...task, dueAt } : task));
    tasksRef.current = next;
    setTasks(next);
    speak(dueAt ? "think" : "idle", dueAt ? "Dia marcado." : "Tirei o dia dessa.");
    chain(id, async () => {
      const current = tasksRef.current.find((task) => task.id === id)?.dueAt ?? null;
      try {
        await setTaskDay({ data: { id, dueAt: current } });
      } catch (err) {
        if (isUnauthorized(err)) return;
        const restored = tasksRef.current.map((task) => (task.id === id ? { ...task, dueAt: previous } : task));
        tasksRef.current = restored;
        setTasks(restored);
        speak("shy", "Não consegui marcar o dia.");
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

  return (
    <main className="relative min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-10 pb-40 sm:pt-14">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-accent uppercase">Fantasma</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg">{titles[tab]}</h1>
            <p className="mt-2 text-sm text-muted">
              {ready
                ? remaining === 0
                  ? "Nada pendente. O fantasma está de boa."
                  : `${remaining} pendente${remaining === 1 ? "" : "s"}`
                : "Carregando…"}
              {streak > 0 ? ` · ${streak} dia${streak === 1 ? "" : "s"} seguido${streak === 1 ? "" : "s"}` : ""}
            </p>
          </div>
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
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (event.target.value.trim() && mood !== "think") {
                    speak("think", pick(LINES.think));
                  }
                }}
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
          <Agenda tasks={tasks.filter((task) => !task.done)} groups={agendaGroups()} onDay={schedule} ready={ready} />
        ) : (
          <ul className="flex flex-col gap-3">
            {ready && visible.length === 0 ? (
              <li className="rounded-xl border border-border bg-surface px-5 py-10 text-center">
                <p className="text-sm text-muted">Nada por aqui</p>
                <p className="mt-1 text-xs text-subtle">
                  {tab === "tarefas" ? "Escreve acima. O fantasma reage." : "Troca de aba ou cria uma tarefa."}
                </p>
              </li>
            ) : (
              visible.map(renderTask)
            )}
          </ul>
        )}
      </div>

      <DinoCompanion
        size={dinoSmall ? "sm" : "md"}
        bottomInset={128}
        mood={mood}
        message={dinoTalks ? message : ""}
        onPet={() => speak("shy", pick(LINES.pet))}
      />
      <DockNav tab={tab} onChange={setTab} />
    </main>
  );
}
