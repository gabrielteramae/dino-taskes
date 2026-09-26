import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: Login });

const VERT = `
attribute vec2 a_pos;
attribute float a_size;
attribute vec3 a_color;
attribute float a_alpha;
uniform vec2 u_res;
varying vec3 v_color;
varying float v_alpha;
void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  clip.y *= -1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = a_size;
  v_color = a_color;
  v_alpha = a_alpha;
}`;

const FRAG = `
precision mediump float;
varying vec3 v_color;
varying float v_alpha;
void main() {
  float d = length(gl_PointCoord * 2.0 - 1.0);
  if (d > 1.0) discard;
  float smoke = pow(smoothstep(1.0, 0.0, d), 1.7);
  gl_FragColor = vec4(v_color, v_alpha * smoke);
}`;

const WASH_VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const WASH_FRAG = `
precision mediump float;
uniform vec2 u_res;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float top = smoothstep(0.95, 0.05, length(uv - vec2(0.18, 0.92)));
  float corner = smoothstep(0.9, 0.0, length(uv - vec2(0.92, 0.08)));
  vec3 green = vec3(0.18, 0.55, 0.32) * top + vec3(0.08, 0.38, 0.2) * corner;
  gl_FragColor = vec4(green, max(top, corner) * 0.42);
}`;

const GREENS: Array<[number, number, number]> = [
  [0.08, 0.36, 0.2],
  [0.09, 0.42, 0.2],
  [0.12, 0.48, 0.26],
  [0.14, 0.54, 0.29],
  [0.18, 0.6, 0.34],
  [0.24, 0.67, 0.36],
  [0.3, 0.73, 0.38],
];

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function program(gl: WebGLRenderingContext, vert: string, frag: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, vert);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const handle = gl.createProgram();
  if (!handle) return null;
  gl.attachShader(handle, vs);
  gl.attachShader(handle, fs);
  gl.linkProgram(handle);
  if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) return null;
  return handle;
}

function FallingField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const particles = program(gl, VERT, FRAG);
    const wash = program(gl, WASH_VERT, WASH_FRAG);
    if (!particles || !wash) return;

    const count = 110;
    const pos = new Float32Array(count * 2);
    const size = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const alpha = new Float32Array(count);
    const vx = new Float32Array(count);
    const vy = new Float32Array(count);
    const age = new Float32Array(count);
    const span = new Float32Array(count);
    const base = new Float32Array(count);

    let width = 1;
    let height = 1;
    let ratio = 1;
    const maxPoint = (gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array)[1] ?? 64;

    const reset = (i: number, anywhere: boolean) => {
      const tone = GREENS[i % GREENS.length] ?? GREENS[0];
      const radius = 14 + (i % 9) * 3.2;
      pos[i * 2] = Math.random() * width;
      pos[i * 2 + 1] = anywhere ? Math.random() * height : height + radius;
      vx[i] = (Math.random() - 0.5) * 16;
      vy[i] = -(12 + Math.random() * 28);
      base[i] = radius;
      age[i] = anywhere ? Math.random() : 0;
      span[i] = 4.2 + (i % 5) * 0.7;
      size[i] = Math.min(maxPoint, radius * 2 * ratio);
      alpha[i] = 0.28;
      color[i * 3] = tone[0];
      color[i * 3 + 1] = tone[1];
      color[i * 3 + 2] = tone[2];
    };

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth || 1;
      height = canvas.clientHeight || 1;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    for (let i = 0; i < count; i += 1) reset(i, true);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const posBuf = gl.createBuffer();
    const sizeBuf = gl.createBuffer();
    const colorBuf = gl.createBuffer();
    const alphaBuf = gl.createBuffer();
    const washBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, washBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const loc = {
      pos: gl.getAttribLocation(particles, "a_pos"),
      size: gl.getAttribLocation(particles, "a_size"),
      color: gl.getAttribLocation(particles, "a_color"),
      alpha: gl.getAttribLocation(particles, "a_alpha"),
      res: gl.getUniformLocation(particles, "u_res"),
      washPos: gl.getAttribLocation(wash, "a_pos"),
      washRes: gl.getUniformLocation(wash, "u_res"),
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = performance.now();
    let frame = 0;

    const draw = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      if (!reduce && !document.hidden) {
        for (let i = 0; i < count; i += 1) {
          const t = age[i] ?? 0;
          const sway = Math.sin((pos[i * 2] ?? 0) * 0.012 + now * 0.001 + i) * Math.cos((pos[i * 2 + 1] ?? 0) * 0.009);
          const lift = -(42 + 70 * (1 - t));
          const drag = 1.6 + t * 2.4;
          vx[i] = (vx[i] ?? 0) + (sway * 90 - drag * (vx[i] ?? 0)) * dt;
          vy[i] = (vy[i] ?? 0) + (lift - drag * (vy[i] ?? 0)) * dt;
          pos[i * 2] = (pos[i * 2] ?? 0) + (vx[i] ?? 0) * dt;
          pos[i * 2 + 1] = (pos[i * 2 + 1] ?? 0) + (vy[i] ?? 0) * dt;
          age[i] = t + dt / (span[i] || 5);
          const grown = (base[i] || 16) * (1 + (age[i] ?? 0) * 2.4);
          size[i] = Math.min(maxPoint, grown * 2 * ratio);
          const fade = Math.sin(Math.min(1, age[i] ?? 0) * Math.PI);
          alpha[i] = fade * 0.34;
          const y = pos[i * 2 + 1] ?? 0;
          if ((age[i] ?? 0) >= 1 || y < -grown) reset(i, false);
        }
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(wash);
      gl.bindBuffer(gl.ARRAY_BUFFER, washBuf);
      gl.enableVertexAttribArray(loc.washPos);
      gl.vertexAttribPointer(loc.washPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(loc.washRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.useProgram(particles);
      gl.uniform2f(loc.res, width, height);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc.pos);
      gl.vertexAttribPointer(loc.pos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf);
      gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc.size);
      gl.vertexAttribPointer(loc.size, 1, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
      gl.bufferData(gl.ARRAY_BUFFER, color, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc.color);
      gl.vertexAttribPointer(loc.color, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuf);
      gl.bufferData(gl.ARRAY_BUFFER, alpha, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc.alpha);
      gl.vertexAttribPointer(loc.alpha, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, count);

      if (!reduce) frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}

const GENERIC_AUTH_ERROR = "Não foi possível entrar. Confira os dados e tente de novo.";
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
          name: cleanEmail.split("@")[0] || "Você",
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
      <div className="login-grid" aria-hidden="true" />
      <FallingField />
      <div className="login-rise relative mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
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
              <label className="login-field relative block" style={{ animationDelay: "180ms" }}>
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
              <label className="login-field relative block" style={{ animationDelay: "240ms" }}>
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
              <Button type="submit" disabled={busy} className="login-field login-submit mt-1 h-12 w-full" style={{ animationDelay: "300ms" }}>
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
