import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen } from "@/components/auth-screen";

export const Route = createFileRoute("/notificacoes")({ component: Notificacoes });

function Notificacoes() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const askBrowser = async () => {
    if (typeof Notification === "undefined") return;
    const next = await Notification.requestPermission();
    setPerm(next);
  };

  return (
    <AuthScreen title="Notificações">
      <p className="mb-4 text-sm text-muted">Opcional no sistema do celular.</p>
      <div className="rounded-xl border border-border bg-surface px-4 py-4">
        <p className="text-sm text-fg">Alertas do sistema</p>
        <p className="mt-1 text-xs text-subtle">
          {perm === "granted"
            ? "Permitido neste aparelho."
            : perm === "denied"
              ? "Bloqueado no navegador."
              : perm === "unsupported"
                ? "Este aparelho não suporta alerta do sistema."
                : "Ainda não pedido."}
        </p>
        {perm === "default" ? (
          <button
            type="button"
            onClick={() => void askBrowser()}
            className="mt-3 text-sm font-medium text-accent hover:underline"
          >
            Permitir alertas
          </button>
        ) : null}
      </div>
    </AuthScreen>
  );
}
