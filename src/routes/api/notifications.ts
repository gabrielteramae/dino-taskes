import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/verify.server";
import { cleanLine, safePushEndpoint } from "@/lib/security";

const Message = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().max(180).optional(),
});

const Sub = z.object({
  endpoint: z.string().max(2000).refine((value) => safePushEndpoint(value) !== null),
  p256dh: z.string().min(1).max(300),
  auth: z.string().min(1).max(300),
});

async function userId() {
  const user = await getSessionUser();
  return user?.id ?? null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/notifications")({
  server: {
    handlers: {
      GET: async () => {
        const id = await userId();
        if (!id) return json({ error: "Unauthorized" }, 401);
        const { vapidPublicKey } = await import("@/lib/push.server");
        return json({ publicKey: await vapidPublicKey() });
      },
      PUT: async ({ request }) => {
        const id = await userId();
        if (!id) return json({ error: "Unauthorized" }, 401);
        const parsed = Sub.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Corpo inválido" }, 400);
        const { saveSubscription } = await import("@/lib/push.server");
        const endpoint = safePushEndpoint(parsed.data.endpoint);
        if (!endpoint) return json({ error: "Corpo inválido" }, 400);
        await saveSubscription(id, endpoint, parsed.data.p256dh, parsed.data.auth);
        return json({ ok: true });
      },
      POST: async ({ request }) => {
        const id = await userId();
        if (!id) return json({ error: "Unauthorized" }, 401);
        const parsed = Message.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Corpo inválido" }, 400);
        const { deliver } = await import("@/lib/push.server");
        return json(await deliver(id, cleanLine(parsed.data.title, 80), cleanLine(parsed.data.body ?? "", 180)));
      },
      DELETE: async ({ request }) => {
        const id = await userId();
        if (!id) return json({ error: "Unauthorized" }, 401);
        const parsed = z
          .object({ endpoint: z.string().max(2000).refine((value) => safePushEndpoint(value) !== null) })
          .safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Corpo inválido" }, 400);
        const endpoint = safePushEndpoint(parsed.data.endpoint);
        if (!endpoint) return json({ error: "Corpo inválido" }, 400);
        const { removeSubscription } = await import("@/lib/push.server");
        await removeSubscription(id, endpoint);
        return json({ ok: true });
      },
    },
  },
});
