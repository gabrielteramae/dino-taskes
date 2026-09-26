import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthScreen, SettingGroup, SettingRow } from "@/components/auth-screen";
import { consentLabel, commitConsent, ConsentSwitches, useConsentChoice } from "@/components/cookie-consent";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listCookies, type CookieKind } from "@/lib/cookies";
import { CONSENT_OFF, type Consent } from "@/lib/consent";
import { clearStoredKind, listLocalStorage, type StorageKind } from "@/lib/storage";
import { deleteMyAccount } from "@/lib/account";
import { deleteAllTasks, exportMyData } from "@/lib/tasks";

export const Route = createFileRoute("/privacidade")({ component: Privacidade });

function Privacidade() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [cookies, setCookies] = useState<Array<{ name: string; kind: CookieKind }>>([]);
  const [stored, setStored] = useState<Array<{ key: string; kind: StorageKind }>>([]);
  const consent = useConsentChoice();
  const { user } = useCurrentUserState();
  const current = consent ?? CONSENT_OFF;

  useEffect(() => {
    setCookies(listCookies());
    setStored(listLocalStorage());
  }, [consent]);

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

  const eraseAccount = async () => {
    if (
      !window.confirm(
        "Excluir a conta e os dados vinculados? Serão apagados e-mail, nome, senha, tarefas, preferências, avisos e sessão. Esta operação é irreversível.",
      )
    ) {
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      await deleteMyAccount();
      try {
        await signOut("/login");
      } catch {
        window.location.href = "/login";
      }
    } catch {
      setStatus("Não foi possível excluir a conta.");
      setBusy(false);
    }
  };

  const wipe = async () => {
    if (!window.confirm("Excluir todas as tarefas desta conta? A operação não remove o e-mail nem a senha.")) return;
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

  return (
    <AuthScreen title="Privacidade">
      <p className="mb-4 text-sm text-muted">
        Os registros da lista são vinculados exclusivamente à conta autenticada. Terceiros não leem, alteram nem
        enumeram o conteúdo.
      </p>
      <SettingGroup>
        <SettingRow title="Dados tratados" hint="Correio eletrônico, nome e tarefas. A senha permanece apenas como hash." />
        <SettingRow title="Acesso" hint="Cada requisição é autorizada pela sessão. O cliente não envia identificador arbitrário." />
        <SettingRow title="Finalidade" hint="Não há venda de dados nem rastreamento publicitário." />
        <SettingRow title="Dados móveis" hint="O tráfego limita-se a autenticação, gravação da lista e aviso, se habilitado." />
        <SettingRow title="Cookies neste aparelho" hint={consentLabel(consent)} />
      </SettingGroup>

      <p className="mt-6 mb-2 text-sm text-fg">Cookies de sessão</p>
      <ul className="overflow-hidden rounded-xl border border-border bg-surface">
        <li className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm">
          <span>
            <span className="block text-fg">Sessão da conta</span>
            <span className="mt-0.5 block text-xs text-subtle">Oculto, dura 7 dias e mantém você logado. Não entra em anúncio.</span>
          </span>
          <span className="shrink-0 text-xs text-subtle">{user ? "Ativa" : "Sem sessão"}</span>
        </li>
        <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span>
            <span className="block text-fg">Cópia neste aparelho</span>
            <span className="mt-0.5 block text-xs text-subtle">Fica salva para você voltar logado. Só some ao encerrar a sessão.</span>
          </span>
          <span className="shrink-0 text-xs text-subtle">{user ? "Guardada" : "Não"}</span>
        </li>
      </ul>
      <Button
        variant="danger"
        className="mt-3 w-full border border-border"
        disabled={!user || busy}
        onClick={() => void signOut("/login")}
      >
        Encerrar sessão neste aparelho
      </Button>

      <p className="mt-6 mb-2 text-sm text-fg">Cookies de terceiros</p>
      <ul className="overflow-hidden rounded-xl border border-border bg-surface">
        <li className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm">
          <span>
            <span className="block text-fg">Google Fonts</span>
            <span className="mt-0.5 block text-xs text-subtle">Só a fonte da tela. Dá para bloquear.</span>
          </span>
          <span className="shrink-0 text-xs text-subtle">{current.thirdParty ? "Permitido" : "Bloqueado"}</span>
        </li>
        <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span>
            <span className="block text-fg">Google, no login</span>
            <span className="mt-0.5 block text-xs text-subtle">Os cookies ficam no site do Google. Este app não lê nem apaga.</span>
          </span>
          <span className="shrink-0 text-xs text-subtle">Fora daqui</span>
        </li>
      </ul>
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          className="flex-1 border border-border"
          onClick={() => commitConsent({ ...current, thirdParty: false })}
        >
          Bloquear terceiros
        </Button>
        <Button className="flex-1" onClick={() => commitConsent({ ...current, thirdParty: true })}>
          Permitir terceiros
        </Button>
      </div>

      <p className="mt-6 mb-2 text-sm text-fg">Outros cookies</p>
      <ul className="overflow-hidden rounded-xl border border-border bg-surface">
        {cookies.length === 0 ? (
          <li className="px-4 py-3 text-xs text-subtle">
            Nenhum cookie visível para o JavaScript. O de sessão fica oculto de propósito.
          </li>
        ) : (
          cookies.map((cookie) => (
            <li key={cookie.name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 truncate text-fg">{cookie.name}</span>
              <span className="shrink-0 text-xs text-subtle">
                {cookie.kind === "essential" ? "Necessário" : "Opcional"}
              </span>
            </li>
          ))
        )}
      </ul>
      <div className="mt-3 rounded-xl border border-border bg-surface px-4 py-3">
        <ConsentSwitches
          value={current}
          onChange={(next: Consent) => {
            commitConsent(next);
            setCookies(listCookies());
            setStored(listLocalStorage());
          }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          className="flex-1 border border-border"
          onClick={() => {
            commitConsent(CONSENT_OFF);
            setCookies(listCookies());
            setStored(listLocalStorage());
          }}
        >
          Só o necessário
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            commitConsent({ preferences: true, analytics: true, marketing: true, thirdParty: true });
            setCookies(listCookies());
            setStored(listLocalStorage());
          }}
        >
          Aceitar tudo
        </Button>
      </div>

      <p className="mt-6 mb-2 text-sm text-fg">LocalStorage</p>
      <ul className="overflow-hidden rounded-xl border border-border bg-surface">
        {stored.length === 0 ? (
          <li className="px-4 py-3 text-xs text-subtle">Nada guardado neste aparelho.</li>
        ) : (
          stored.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 text-sm last:border-0">
              <span className="min-w-0 truncate text-fg">{item.key}</span>
              <span className="shrink-0 text-xs text-subtle">
                {item.kind === "consent"
                  ? "Consentimento"
                  : item.kind === "preferences"
                    ? "Preferência"
                    : item.kind === "session"
                      ? "Sessão"
                      : "Outro"}
              </span>
            </li>
          ))
        )}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button
          variant="ghost"
          className="flex-1 border border-border"
          onClick={() => {
            clearStoredKind("preferences");
            commitConsent({ ...current, preferences: false });
            setStored(listLocalStorage());
          }}
        >
          Limpar preferências
        </Button>
        <Button
          variant="ghost"
          className="flex-1 border border-border"
          onClick={() => {
            clearStoredKind("other");
            setStored(listLocalStorage());
          }}
        >
          Limpar outros
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Button variant="ghost" className="w-full border border-border" disabled={busy} onClick={() => void exportData()}>
          Exportar minhas tarefas
        </Button>
        <Button variant="danger" className="w-full border border-border" disabled={busy} onClick={() => void wipe()}>
          Excluir somente a lista
        </Button>
        <Button variant="danger" className="w-full border border-border" disabled={busy} onClick={() => void eraseAccount()}>
          Excluir conta e dados
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
