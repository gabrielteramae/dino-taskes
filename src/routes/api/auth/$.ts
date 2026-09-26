import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { strongPassword, tooManyAttempts, validEmail } from "@/lib/security";

function refused(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "cache-control": "no-store" } });
}

async function guardAuth(request: Request) {
  const path = new URL(request.url).pathname;
  const signingUp = path.endsWith("/sign-up/email");
  const signingIn = path.endsWith("/sign-in/email");
  if (request.method !== "POST" || (!signingUp && !signingIn)) return auth.handler(request);

  const size = Number(request.headers.get("content-length") || 0);
  if (size > 8_000) return refused("Requisição recusada.", 413);

  const body = (await request.clone().json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!validEmail(email)) return refused("Não foi possível entrar.", 400);
  if (signingUp && !strongPassword(password)) return refused("Senha fraca.", 400);
  if (signingIn && (password.length < 8 || password.length > 128)) return refused("Não foi possível entrar.", 400);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooManyAttempts(`${signingUp ? "up" : "in"}:${ip}:${email}`, signingUp ? 5 : 8, 10 * 60_000)) {
    return refused("Muitas tentativas. Espere um pouco.", 429);
  }
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => guardAuth(request),
    },
  },
});
