import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { GROK_PROVIDERS, authClient, authEnabled, getBearerToken, keepSignedIn, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { strongPassword, validEmail } from "@/lib/security";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

const GENERIC_AUTH_ERROR = "Não foi possível entrar. Confira os dados e tente de novo.";
const PASSWORD_RULE = "A senha precisa de 8 caracteres, com maiúscula, minúscula, número e um símbolo.";
const GOOGLE = GROK_PROVIDERS.find((p) => p.idp === "google");

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.04h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.31 2.99-7.43Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.34l-3.23-2.5c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.58A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.99A6 6 0 0 1 6.07 12c0-.69.12-1.36.32-1.99V7.43H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.57l3.34-2.58Z" />
      <path fill="#EA4335" d="M12 5.88c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.96 2.89 14.7 2 12 2 7.94 2 4.43 4.34 3.05 7.43l3.34 2.58C7.18 7.64 9.39 5.88 12 5.88Z" />
    </svg>
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("erro") === "google") {
      setError("Não foi possível entrar com o Google. Tente de novo.");
    }
    let gone = false;
    const resume = () => {
      if (gone || !getBearerToken()) return;
      void authClient.getSession().then(({ data }) => {
        if (!gone && data?.user) window.location.replace("/");
      });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") resume();
    };
    resume();
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      gone = true;
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

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
    if (!validEmail(cleanEmail) || password.length < 8 || password.length > 128) {
      setError(GENERIC_AUTH_ERROR);
      return;
    }
    if (mode === "signup" && !strongPassword(password)) {
      setError(PASSWORD_RULE);
      return;
    }
    setBusy(true);
    setError("");
    const fetchOptions = {
      onSuccess(ctx: { response: Response }) {
        const token = ctx.response.headers.get("set-auth-token");
        if (token) keepSignedIn(token);
      },
    };
    try {
      if (mode === "signup") {
        const { error: signUpError } = await authClient.signUp.email({
          email: cleanEmail,
          password,
          name: cleanEmail.split("@")[0] || "Você",
          fetchOptions,
        });
        if (signUpError) throw new Error("auth");
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: cleanEmail,
          password,
          rememberMe: true,
          fetchOptions,
        });
        if (signInError) throw new Error("auth");
      }
      window.location.href = "/";
    } catch {
      setError(GENERIC_AUTH_ERROR);
      toast.error(GENERIC_AUTH_ERROR);
      setBusy(false);
    }
  };

  return (
    <main className="login-glow relative min-h-dvh overflow-hidden bg-bg text-fg">
      <div className="page-shell login-rise relative mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center">
        <div className="login-card">
        <h1 className="login-field text-3xl font-semibold tracking-tight" style={{ animationDelay: "40ms" }}>
          {mode === "signin" ? "Bem-vindo de volta" : "Crie sua conta"}
        </h1>
        <p className="login-field mt-2 text-sm text-muted" style={{ animationDelay: "120ms" }}>
          {mode === "signin"
            ? "Entre para continuar nas suas tarefas."
            : "Guarde a lista na sua conta, em qualquer aparelho."}
        </p>

        {!authEnabled ? (
          <p className="mt-8 text-sm text-muted">Entrar está indisponível no momento.</p>
        ) : (
          <>
            <form className="mt-8 flex flex-col gap-3" onSubmit={submit}>
              <div className="login-field flex flex-col gap-1.5" style={{ animationDelay: "180ms" }}>
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="login-field flex flex-col gap-1.5" style={{ animationDelay: "240ms" }}>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    maxLength={128}
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
                </div>
              </div>
              {error ? <p className="text-xs text-danger">{error}</p> : null}
              <Button type="submit" disabled={busy} className="login-field login-submit mt-1 h-12 w-full" style={{ animationDelay: "300ms" }}>
                {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            {GOOGLE ? (
              <>
                <div className="my-6 flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-subtle">ou continue com</span>
                  <Separator className="flex-1" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    void signIn(GOOGLE.providerId, { callbackURL: "/" }).catch(() => {
                      setError("Não foi possível entrar com o Google. Tente de novo.");
                    });
                  }}
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
              <Link to="/termos" className="hover:text-fg">
                Termos
              </Link>
              {" · "}
              <Link to="/termos" hash="privacidade" className="hover:text-fg">
                Privacidade
              </Link>
              {" · "}
              <Link to="/termos" hash="direitos" className="hover:text-fg">
                Direitos
              </Link>
              <span className="mt-2 block">© 2026 Gabriel Teramae Chan. Todos os direitos reservados.</span>
            </p>
          </>
        )}
        </div>
      </div>
    </main>
  );
}
