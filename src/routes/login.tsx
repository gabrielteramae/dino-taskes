import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: Login });

const GENERIC_AUTH_ERROR = "Não foi possível entrar. Confira os dados e tente de novo.";
const GOOGLE = GROK_PROVIDERS.find((p) => p.idp === "google");

function GoogleMark() {
  return (
    <span className="grid size-4 place-items-center rounded-full border border-current text-[10px] font-semibold leading-none" aria-hidden="true">
      G
    </span>
  );
}

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isPending) {
    return (
      <main className="login-glow flex min-h-dvh items-center justify-center px-5">
        <div className="h-80 w-full max-w-sm animate-pulse rounded-2xl bg-surface/60" />
      </main>
    );
  }

  if (user) return <Navigate to="/" />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!authEnabled || busy) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || password.length < 8 || password.length > 128) {
      setError(GENERIC_AUTH_ERROR);
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") {
        const { error: signUpError } = await authClient.signUp.email({
          email: cleanEmail,
          password,
          name: cleanEmail.split("@")[0] || "Dino",
        });
        if (signUpError) throw new Error("auth");
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: cleanEmail,
          password,
        });
        if (signInError) throw new Error("auth");
      }
      window.location.href = "/";
    } catch {
      setError(GENERIC_AUTH_ERROR);
      setBusy(false);
    }
  };

  return (
    <main className="login-glow relative min-h-dvh overflow-hidden bg-bg text-fg">
      <div className="login-orb login-orb-a" aria-hidden="true" />
      <div className="login-orb login-orb-b" aria-hidden="true" />
      <div className="login-rise relative mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
        <p className="text-xs font-medium tracking-[0.18em] text-accent uppercase">Dino Tarefas</p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {mode === "signin" ? "Bem-vindo de volta" : "Crie sua conta"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === "signin"
            ? "Entre para continuar nas suas tarefas."
            : "Guarde a lista no seu dino, em qualquer aparelho."}
        </p>

        {!authEnabled ? (
          <p className="mt-8 text-sm text-muted">Entrar está indisponível no momento.</p>
        ) : (
          <>
            <form className="mt-8 flex flex-col gap-3" onSubmit={submit}>
              <label className="relative block">
                <span className="sr-only">E-mail</span>
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
                <Input
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </label>
              <label className="relative block">
                <span className="sr-only">Senha</span>
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={8}
                  maxLength={128}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-10"
                  required
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center text-subtle hover:text-fg"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </label>
              {error ? <p className="text-xs text-danger">{error}</p> : null}
              <Button type="submit" disabled={busy} className="mt-1 h-12 w-full">
                {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            {GOOGLE ? (
              <>
                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-subtle">ou continue com</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <button
                  type="button"
                  onClick={() => signIn(GOOGLE.providerId, { callbackURL: "/" })}
                  className={cn(
                    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm text-fg",
                    "transition-transform duration-150 ease-out hover:bg-surface-2 active:scale-[0.96]",
                  )}
                >
                  <GoogleMark />
                  Google
                </button>
              </>
            ) : null}

            <p className="mt-8 text-center text-sm text-muted">
              {mode === "signin" ? "Não tem conta?" : "Já tem conta?"}{" "}
              <button
                type="button"
                className="font-medium text-accent hover:underline"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError("");
                }}
              >
                {mode === "signin" ? "Criar uma" : "Entrar"}
              </button>
            </p>
            <p className="mt-8 text-center text-[11px] leading-relaxed text-subtle">
              © 2026 Gabriel Teramae Chan. Todos os direitos reservados.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
