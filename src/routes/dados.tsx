import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { Button } from "@/components/ui/button";
import { readPersistence, type PersistenceSnapshot } from "@/lib/persistence";

export const Route = createFileRoute("/dados")({ component: Dados });

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dados() {
  const [snap, setSnap] = useState<PersistenceSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      setSnap(await readPersistence());
    } catch {
      setError("Não consegui ler o banco agora.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const engine =
    snap?.engine === "postgres" ? "Postgres" : snap ? "PGLite, nesta máquina" : "…";

  return (
    <AuthScreen title="Dados salvos">
      <SettingGroup>
        <SettingRow title="Onde está salvo">
          <span className="text-xs text-muted">{engine}</span>
        </SettingRow>
        <SettingRow title="Tarefas gravadas">
          <span className="text-xs text-fg">{snap ? snap.tasks : "…"}</span>
        </SettingRow>
        <SettingRow title="Concluídas">
          <span className="text-xs text-fg">{snap ? snap.done : "…"}</span>
        </SettingRow>
        <SettingRow title="Com dia marcado">
          <span className="text-xs text-fg">{snap ? snap.scheduled : "…"}</span>
        </SettingRow>
        <SettingRow title="Última gravação">
          <span className="text-xs text-muted">{formatWhen(snap?.newestAt ?? null)}</span>
        </SettingRow>
      </SettingGroup>

      <h2 className="mt-8 mb-3 text-sm font-medium text-muted">Linhas da sua conta</h2>
      <ul className="flex flex-col gap-2">
        {snap && snap.rows.length === 0 ? (
          <li className="rounded-xl border border-border bg-surface px-4 py-6 text-sm text-muted">
            Ainda não há linhas. Cria uma tarefa e volta aqui.
          </li>
        ) : (
          snap?.rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-sm text-fg">{row.text}</p>
              <p className="mt-1 text-xs text-subtle">
                {row.done ? "feita" : "pendente"}
                {row.dueAt ? ` · dia ${formatWhen(row.dueAt)}` : ""} · {formatWhen(row.createdAt)}
              </p>
            </li>
          ))
        )}
      </ul>

      <Button className="mt-6 w-full" disabled={busy} onClick={() => void load()}>
        {busy ? "Lendo…" : "Ler de novo do banco"}
      </Button>
      {error ? <p className="mt-3 text-center text-xs text-danger">{error}</p> : null}
    </AuthScreen>
  );
}
