import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { Switch } from "@/components/ui/switch";
import { getPrefs, updatePrefs, type UserPrefs } from "@/lib/prefs";

export const Route = createFileRoute("/notificacoes")({ component: Notificacoes });

function Notificacoes() {
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    void getPrefs()
      .then(setPrefs)
      .catch(() => undefined);
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const patch = async (partial: Partial<UserPrefs>) => {
    if (!prefs) return;
    const prev = prefs;
    setPrefs({ ...prefs, ...partial });
    try {
      setPrefs(await updatePrefs({ data: partial }));
    } catch {
      setPrefs(prev);
    }
  };

  const askBrowser = async () => {
    if (typeof Notification === "undefined") return;
    const next = await Notification.requestPermission();
    setPerm(next);
  };

  return (
    <AuthScreen title="Notificações">
      <p className="mb-4 text-sm text-muted">O dino avisa no app. Opcional no sistema do celular.</p>
      <SettingGroup>
        <SettingRow title="Ao concluir" hint="Ele comemora quando você risca uma tarefa.">
          <Switch
            label="Ao concluir"
            checked={prefs?.notifyDone ?? true}
            onCheckedChange={(v) => void patch({ notifyDone: v })}
          />
        </SettingRow>
        <SettingRow title="Dino ocioso" hint="Se a lista parar, ele cochila e chama você.">
          <Switch
            label="Dino ocioso"
            checked={prefs?.notifyDino ?? true}
            onCheckedChange={(v) => void patch({ notifyDino: v })}
          />
        </SettingRow>
      </SettingGroup>

      <div className="mt-6 rounded-xl border border-border bg-surface px-4 py-4">
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
