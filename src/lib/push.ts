import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

const Message = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().max(180),
});

const Sub = z.object({
  endpoint: z.string().url().max(2000),
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
    await saveSubscription(context.userId, data.endpoint, data.p256dh, data.auth);
    return { ok: true as const };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ endpoint: z.string().url() }).parse(input))
  .handler(async ({ context, data }) => {
    const { removeSubscription } = await import("./push.server");
    await removeSubscription(context.userId, data.endpoint);
    return { ok: true as const };
  });

export const sendUserPush = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => Message.parse(input))
  .handler(async ({ context, data }) => {
    const { deliver } = await import("./push.server");
    return deliver(context.userId, data.title, data.body);
  });
