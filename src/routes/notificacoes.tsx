import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { Switch } from "@/components/ui/switch";
import { notificationsSupported, notifyNow } from "@/lib/notify";
import { getPrefs, updatePrefs, type UserPrefs } from "@/lib/prefs";

export const Route = createFileRoute("/notificacoes")({ component: Notificacoes });

function Notificacoes() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [test, setTest] = useState("");

  useEffect(() => {
    setPerm(notificationsSupported() ? Notification.permission : "unsupported");
    void getPrefs()
      .then(setPrefs)
      .catch(() => undefined);
  }, []);

  const askBrowser = async () => {
    if (!notificationsSupported()) return;
    const next = await Notification.requestPermission();
    setPerm(next);
    if (next === "granted") {
      notifyNow("Alertas ligados", "Você recebe aviso das tarefas deste aparelho.", "perm-ok");
    }
  };

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

  const tryNow = () => {
    if (perm !== "granted") {
      setTest("Permita os alertas do sistema antes.");
      return;
    }
    const ok = notifyNow("Tarefa de exemplo", "Assim aparece o aviso no aparelho.", `test:${Date.now()}`);
    setTest(ok ? "Aviso enviado." : "O navegador bloqueou o aviso.");
  };

  return (
    <AuthScreen title="Notificações">
      <p className="mb-4 text-sm text-muted">
        O aviso sai pelo navegador deste aparelho, enquanto o app está aberto. Não há servidor de push.
      </p>
      <SettingGroup>
        <SettingRow title="Tarefas do dia" hint="Uma vez por dia, se houver algo para hoje ou atrasado.">
          <Switch
            label="Tarefas do dia"
            checked={prefs?.notifyDino ?? true}
            onCheckedChange={(value) => void patch({ notifyDino: value })}
          />
        </SettingRow>
        <SettingRow title="Ao concluir" hint="Avisa quando você marca uma tarefa como feita.">
          <Switch
            label="Ao concluir"
            checked={prefs?.notifyDone ?? true}
            onCheckedChange={(value) => void patch({ notifyDone: value })}
          />
        </SettingRow>
      </SettingGroup>

      <div className="mt-6 rounded-xl border border-border bg-surface px-4 py-4">
        <p className="text-sm text-fg">Alertas do sistema</p>
        <p className="mt-1 text-xs text-subtle">
          {perm === "granted"
            ? "Permitido neste aparelho."
            : perm === "denied"
              ? "Bloqueado no navegador. Libere nas configurações do site."
              : perm === "unsupported"
                ? "Este aparelho não suporta alerta do sistema."
                : "Ainda não pedido."}
        </p>
        {perm === "default" ? (
          <button type="button" onClick={() => void askBrowser()} className="mt-3 text-sm font-medium text-accent hover:underline">
            Permitir alertas
          </button>
        ) : null}
        {perm === "granted" ? (
          <button type="button" onClick={tryNow} className="mt-3 text-sm font-medium text-accent hover:underline">
            Enviar um aviso de teste
          </button>
        ) : null}
        {test ? <p className="mt-2 text-xs text-muted">{test}</p> : null}
      </div>
    </AuthScreen>
  );
}
