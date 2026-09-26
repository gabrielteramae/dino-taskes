import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function LegalScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto w-full max-w-lg px-5 pt-10 pb-16">
        <header className="mb-8 flex items-center gap-2">
          <Link
            to="/"
            aria-label="Voltar"
            className="grid size-11 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="min-w-0 flex-1 text-xl font-semibold tracking-tight">{title}</h1>
        </header>
        {children}
        <p className="mt-10 text-center text-[11px] leading-relaxed text-subtle">
          © 2026 Gabriel Teramae Chan. Todos os direitos reservados.
        </p>
      </div>
    </main>
  );
}
