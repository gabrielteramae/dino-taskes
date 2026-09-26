import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { removePushSubscription } from "@/lib/push";

export const Route = createFileRoute("/notificacoes")({ component: Notificacoes });

function Notificacoes() {
  useEffect(() => {
    void (async () => {
      const registration = await navigator.serviceWorker?.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return;
      await removePushSubscription({ data: { endpoint: subscription.endpoint } }).catch(() => undefined);
      await subscription.unsubscribe().catch(() => undefined);
    })();
  }, []);

  return (
    <AuthScreen title="Notificações">
      <p className="text-sm text-muted">
        Os avisos do app estão desligados. Nada é enviado ao concluir uma tarefa, nem sobre o dia.
      </p>
    </AuthScreen>
  );
}
