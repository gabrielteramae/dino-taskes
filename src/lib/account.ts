import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const sql = await getSql();
    const id = context.userId;
    await sql`delete from tasks where user_id = ${id}`;
    await sql`delete from user_prefs where user_id = ${id}`;
    await sql`delete from user_settings where user_id = ${id}`;
    await sql`delete from user_streaks where user_id = ${id}`;
    await sql`delete from push_subscriptions where user_id = ${id}`;
    const rows = await sql<{ email: string }>`select "email" from "user" where "id" = ${id}`;
    const email = rows[0]?.email;
    if (email) await sql`delete from "verification" where "identifier" = ${email}`;
    await sql`delete from "user" where "id" = ${id}`;
    return { ok: true };
  });
