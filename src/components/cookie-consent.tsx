import { useEffect, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "cookie-consent";

export type ConsentChoice = "essential" | "all";

let choice: ConsentChoice | "" | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readStored(): ConsentChoice | "" {
  try {
    const value = localStorage.getItem(KEY);
    return value === "all" || value === "essential" ? value : "";
  } catch {
    return "essential";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  return choice;
}

export function useConsentChoice() {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

export function consentLabel(value: ConsentChoice | "" | null) {
  if (value === "all") return "Você aceitou o aviso.";
  if (value === "essential") return "Só o cookie de sessão, o necessário para entrar.";
  return "Ainda sem escolha.";
}

export function reopenConsent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  choice = "";
  emit();
}

function saveConsent(value: ConsentChoice) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* ignore */
  }
  choice = value;
  emit();
}

export function CookieConsent() {
  const current = useSyncExternalStore(subscribe, snapshot, () => null);

  useEffect(() => {
    if (choice !== null) return;
    choice = readStored();
    emit();
  }, []);

  if (current !== "") return null;

  return (
    <div
      role="dialog"
      aria-labelledby="privacy-banner-title"
      className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-lg rounded-2xl border border-border bg-surface p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      <p id="privacy-banner-title" className="text-sm font-medium text-fg">
        Privacidade
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Usamos um cookie de sessão para manter o login. Não há cookie de anúncio. O tema fica só neste aparelho.{" "}
        <Link to="/termos" hash="privacidade" className="font-medium text-accent hover:underline">
          Ler a política
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => saveConsent("essential")}
          className="h-10 flex-1 rounded-lg border border-border text-sm text-fg"
        >
          Só o necessário
        </button>
        <button
          type="button"
          onClick={() => saveConsent("all")}
          className="h-10 flex-1 rounded-lg bg-accent text-sm font-medium text-accent-fg"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
