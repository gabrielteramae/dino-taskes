import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

import { isThemeMode, type ThemeMode } from "@/lib/theme";

export type UserPrefs = {
  displayName: string;
  dinoTalks: boolean;
  dinoSmall: boolean;
  confirmDelete: boolean;
  notifyDone: boolean;
  notifyDino: boolean;
  theme: ThemeMode;
};

const DEFAULTS: UserPrefs = {
  displayName: "",
  dinoTalks: true,
  dinoSmall: false,
  confirmDelete: false,
  notifyDone: true,
  notifyDino: true,
  theme: "dark",
};

function asBool(v: unknown, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (v === "t" || v === "true" || v === 1) return true;
  if (v === "f" || v === "false" || v === 0) return false;
  return fallback;
}

function rowToPrefs(row: Record<string, unknown> | undefined): UserPrefs {
  if (!row) return { ...DEFAULTS };
  return {
    displayName: typeof row.display_name === "string" ? row.display_name : "",
    dinoTalks: asBool(row.dino_talks, true),
    dinoSmall: asBool(row.dino_small, false),
    confirmDelete: asBool(row.confirm_delete, false),
    notifyDone: asBool(row.notify_done, true),
    notifyDino: asBool(row.notify_dino, true),
    theme: isThemeMode(row.theme) ? row.theme : "dark",
  };
}

function sanitizeName(raw: string) {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

const Patch = z
  .object({
    displayName: z.string().max(80).optional(),
    dinoTalks: z.boolean().optional(),
    dinoSmall: z.boolean().optional(),
    confirmDelete: z.boolean().optional(),
    notifyDone: z.boolean().optional(),
    notifyDino: z.boolean().optional(),
    theme: z.enum(["dark", "light"]).optional(),
  })
  .strict();

export const getPrefs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UserPrefs> => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select display_name, dino_talks, dino_small, confirm_delete, notify_done, notify_dino, theme
      from user_prefs where user_id = ${context.userId}
    `;
    if (rows[0]) return rowToPrefs(rows[0]);
    await sql`
      insert into user_prefs (user_id) values (${context.userId})
      on conflict (user_id) do nothing
    `;
    return { ...DEFAULTS };
  });

export const updatePrefs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => Patch.parse(input))
  .handler(async ({ context, data }): Promise<UserPrefs> => {
    const sql = await getSql();
    const currentRows = await sql<Record<string, unknown>>`
      select display_name, dino_talks, dino_small, confirm_delete, notify_done, notify_dino, theme
      from user_prefs where user_id = ${context.userId}
    `;
    const current = rowToPrefs(currentRows[0]);
    const next: UserPrefs = {
      displayName:
        data.displayName !== undefined ? sanitizeName(data.displayName) : current.displayName,
      dinoTalks: data.dinoTalks ?? current.dinoTalks,
      dinoSmall: data.dinoSmall ?? current.dinoSmall,
      confirmDelete: data.confirmDelete ?? current.confirmDelete,
      notifyDone: data.notifyDone ?? current.notifyDone,
      notifyDino: data.notifyDino ?? current.notifyDino,
      theme: data.theme ?? current.theme,
    };
    await sql`
      insert into user_prefs (
        user_id, display_name, dino_talks, dino_small, confirm_delete, notify_done, notify_dino, theme, updated_at
      )
      values (
        ${context.userId}, ${next.displayName}, ${next.dinoTalks}, ${next.dinoSmall},
        ${next.confirmDelete}, ${next.notifyDone}, ${next.notifyDino}, ${next.theme}, now()
      )
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        dino_talks = excluded.dino_talks,
        dino_small = excluded.dino_small,
        confirm_delete = excluded.confirm_delete,
        notify_done = excluded.notify_done,
        notify_dino = excluded.notify_dino,
        theme = excluded.theme,
        updated_at = now()
    `;
    return next;
  });
