import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  CircleHelp,
  ChevronRight,
  Database,
  KeyRound,
  LogOut,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};

const ITEMS = [
  { to: "/perfil", label: "Perfil", icon: UserRound },
  { to: "/dados", label: "Banco de dados", icon: Database },
  { to: "/oauth", label: "OAuth", icon: KeyRound },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/privacidade", label: "Privacidade", icon: Shield },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
  { to: "/ajuda", label: "Ajuda", icon: CircleHelp },
] as const;

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(subscribe, hasGateSessionMarker, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Abrir menu da conta"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-11 place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
      >
        <Settings className="size-5" strokeWidth={1.8} />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-bg/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-12 right-0 z-50 w-64 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            {ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex h-12 items-center gap-3 px-3 text-sm text-fg hover:bg-surface-2"
              >
                <item.icon className="size-4 text-muted" strokeWidth={1.8} />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="size-4 text-subtle" />
              </Link>
            ))}
            {authEnabled && !gateSession ? (
              <button
                type="button"
                disabled={signingOut}
                onClick={() => {
                  setSigningOut(true);
                  void signOut("/login").catch(() => setSigningOut(false));
                }}
                className={cn(
                  "flex h-12 w-full items-center gap-3 px-3 text-sm text-danger hover:bg-surface-2",
                  "disabled:opacity-50",
                )}
              >
                <LogOut className="size-4" strokeWidth={1.8} />
                {signingOut ? "Saindo…" : "Sair"}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
