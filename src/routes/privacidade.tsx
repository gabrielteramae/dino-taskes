import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useSyncExternalStore } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { consentLabel, reopenConsent, useConsentChoice } from "@/components/cookie-consent";
import { Button } from "@/components/ui/button";
import { deleteAllTasks, exportMyData } from "@/lib/tasks";

export const Route = createFileRoute("/privacidade")({ component: Privacidade });

function Privacidade() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setBusy(true);
    setStatus("");
    try {
      const payload = await exportMyData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tarefas.json";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Arquivo baixado neste aparelho.");
    } catch {
      setStatus("Não foi possível exportar.");
    } finally {
      setBusy(false);
    }
  };

  const wipe = async () => {
    if (!window.confirm("Apagar todas as suas tarefas? Isso não tem volta.")) return;
    setBusy(true);
    setStatus("");
    try {
      await deleteAllTasks();
      setStatus("Lista apagada. Só a sua conta foi afetada.");
    } catch {
      setStatus("Não foi possível apagar.");
    } finally {
      setBusy(false);
    }
  };

  const consent = useConsentChoice();

  return (
    <AuthScreen title="Privacidade">
      <p className="mb-4 text-sm text-muted">
        Suas tarefas são só suas. Ninguém mais lê, altera ou lista o que você escreve.
      </p>
      <SettingGroup>
        <SettingRow title="Dados guardados" hint="E-mail da conta, nome e tarefas. Senha nunca fica visível." />
        <SettingRow title="Acesso" hint="Cada pedido no servidor usa a sua sessão. Sem ID enviado pelo aparelho." />
        <SettingRow title="Sem rastreio extra" hint="Não vendemos dados e não tem feed público." />
        <SettingRow title="Banner de privacidade" hint={consentLabel(consent)}>
          <button type="button" onClick={reopenConsent} className="text-sm font-medium text-accent">
            Configurar
          </button>
        </SettingRow>
      </SettingGroup>

      <div className="mt-6 flex flex-col gap-3">
        <Button variant="ghost" className="w-full border border-border" disabled={busy} onClick={() => void exportData()}>
          Exportar minhas tarefas
        </Button>
        <Button variant="danger" className="w-full border border-border" disabled={busy} onClick={() => void wipe()}>
          Apagar todas as tarefas
        </Button>
      </div>
      {status ? <p className="mt-3 text-center text-xs text-muted">{status}</p> : null}
      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/termos" hash="privacidade" className="font-medium text-accent hover:underline">
          Ler a política de privacidade
        </Link>
      </p>
    </AuthScreen>
  );
}
