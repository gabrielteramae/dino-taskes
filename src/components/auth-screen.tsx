import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AccountMenu } from "@/components/account-menu";

export function AuthScreen({ title, children }: { title: string; children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <main className="min-h-dvh bg-bg px-5 pt-10">
        <div className="mx-auto h-40 w-full max-w-lg animate-pulse rounded-2xl bg-surface" />
      </main>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="page-shell mx-auto w-full max-w-lg">
        <header className="mb-8 flex items-center gap-2">
          <Link
            to="/"
            aria-label="Voltar às tarefas"
            className="grid size-11 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="min-w-0 flex-1 text-xl font-semibold tracking-tight">{title}</h1>
          <AccountMenu />
        </header>
        {children}
      </div>
    </main>
  );
}

export function SettingRow({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg">{title}</p>
        {hint ? <p className="mt-0.5 text-xs text-subtle">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function SettingGroup({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {children}
    </div>
  );
}
