import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { Switch } from "@/components/ui/switch";
import { notificationsSupported, notifyNow } from "@/lib/notify";
import { pushPublicKey, removePushSubscription, savePushSubscription, sendUserPush } from "@/lib/push";
import { getPrefs, updatePrefs, type UserPrefs } from "@/lib/prefs";

export const Route = createFileRoute("/notificacoes")({ component: Notificacoes });

function urlBase64ToBytes(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function Notificacoes() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [test, setTest] = useState("");
  const [pushOn, setPushOn] = useState(false);
  const [pushNote, setPushNote] = useState("");

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

  const tryPush = async () => {
    setPushNote("");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushNote("Este navegador não aceita push.");
      return;
    }
    const permission = notificationsSupported() ? await Notification.requestPermission() : "denied";
    setPerm(permission);
    if (permission !== "granted") {
      setPushNote("Permissão negada.");
      return;
    }
    const registration = await navigator.serviceWorker.register("/sw.js");
    const { publicKey } = await pushPublicKey();
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(publicKey),
      }));
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      setPushNote("O navegador não devolveu a inscrição.");
      return;
    }
    await savePushSubscription({
      data: { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
    setPushOn(true);
    const result = await sendUserPush({ data: { title: "Push ligado", body: "Este aviso veio pela API de push." } });
    setPushNote(result.sent > 0 ? "Push enviado." : "Inscrição salva, mas o envio não chegou.");
  };

  const stopPush = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await removePushSubscription({ data: { endpoint: subscription.endpoint } });
      await subscription.unsubscribe();
    }
    setPushOn(false);
    setPushNote("Push desligado neste aparelho.");
  };

  return (
    <AuthScreen title="Notificações">
      <p className="mb-4 text-sm text-muted">
        O aviso local sai pelo navegador enquanto o app está aberto. O push usa a API e pode chegar em segundo plano.
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

      <div className="mt-6 rounded-xl border border-border bg-surface px-4 py-4">
        <p className="text-sm text-fg">Push</p>
        <p className="mt-1 text-xs text-subtle">
          A API autenticada é /api/notifications. POST envia, PUT inscreve este aparelho, DELETE desliga.
        </p>
        <button type="button" onClick={() => void tryPush()} className="mt-3 text-sm font-medium text-accent hover:underline">
          {pushOn ? "Enviar push de teste" : "Ativar push"}
        </button>
        {pushOn ? (
          <button type="button" onClick={() => void stopPush()} className="mt-3 ml-4 text-sm text-muted hover:underline">
            Desligar
          </button>
        ) : null}
        {pushNote ? <p className="mt-2 text-xs text-muted">{pushNote}</p> : null}
      </div>
    </AuthScreen>
  );
}
