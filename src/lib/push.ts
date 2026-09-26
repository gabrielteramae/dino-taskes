import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { cleanLine, safePushEndpoint } from "@/lib/security";

const Message = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().max(180),
});

const Sub = z.object({
  endpoint: z.string().max(2000).refine((value) => safePushEndpoint(value) !== null),
  p256dh: z.string().min(1).max(300),
  auth: z.string().min(1).max(300),
});

export const pushPublicKey = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { vapidPublicKey } = await import("./push.server");
    return { publicKey: await vapidPublicKey() };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => Sub.parse(input))
  .handler(async ({ context, data }) => {
    const { saveSubscription } = await import("./push.server");
    const endpoint = safePushEndpoint(data.endpoint);
    if (!endpoint) return { ok: false as const };
    await saveSubscription(context.userId, endpoint, data.p256dh, data.auth);
    return { ok: true as const };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ endpoint: z.string().max(2000).refine((value) => safePushEndpoint(value) !== null) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const endpoint = safePushEndpoint(data.endpoint);
    if (!endpoint) return { ok: false as const };
    const { removeSubscription } = await import("./push.server");
    await removeSubscription(context.userId, endpoint);
    return { ok: true as const };
  });

export const sendUserPush = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => Message.parse(input))
  .handler(async ({ context, data }) => {
    const { deliver } = await import("./push.server");
    return deliver(context.userId, cleanLine(data.title, 80), cleanLine(data.body, 180));
  });
