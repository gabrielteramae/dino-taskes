import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "cookie-consent";

export function CookieConsent() {
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    try {
      setChoice(localStorage.getItem(KEY) ?? "");
    } catch {
      setChoice("essential");
    }
  }, []);

  if (choice !== "") return null;

  const save = (value: "essential" | "all") => {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
    setChoice(value);
  };

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-lg rounded-2xl border border-border bg-surface p-4 shadow-lg sm:bottom-6">
      <p className="text-sm leading-relaxed text-fg">Este app usa um cookie de sessão para manter você conectado.</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Não há cookie de anúncio. O tema claro ou escuro fica só neste aparelho.{" "}
        <Link to="/termos" hash="privacidade" className="font-medium text-accent hover:underline">
          Política de privacidade
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => save("essential")}
          className="h-10 flex-1 rounded-lg border border-border text-sm text-fg"
        >
          Só o necessário
        </button>
        <button
          type="button"
          onClick={() => save("all")}
          className="h-10 flex-1 rounded-lg bg-accent text-sm font-medium text-accent-fg"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
