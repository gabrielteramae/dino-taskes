import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export type UserSettings = {
  nickname: string;
  dinoEnabled: boolean;
  dinoMessages: boolean;
  confirmDelete: boolean;
  notifyReminders: boolean;
  notifyDaily: boolean;
};

const DEFAULTS: UserSettings = {
  nickname: "",
  dinoEnabled: true,
  dinoMessages: true,
  confirmDelete: false,
  notifyReminders: false,
  notifyDaily: false,
};

function fail(): never {
  throw new Error("Request failed");
}

function asBool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "t" || value === "true" || value === 1) return true;
  if (value === "f" || value === "false" || value === 0) return false;
  return fallback;
}

function mapRow(row: Record<string, unknown> | undefined): UserSettings {
  if (!row) return { ...DEFAULTS };
  return {
    nickname: typeof row.nickname === "string" ? row.nickname : "",
    dinoEnabled: asBool(row.dino_enabled, true),
    dinoMessages: asBool(row.dino_messages, true),
    confirmDelete: asBool(row.confirm_delete, false),
    notifyReminders: asBool(row.notify_reminders, false),
    notifyDaily: asBool(row.notify_daily, false),
  };
}

function sanitizeNickname(raw: string) {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

const Patch = z.object({
  nickname: z.string().max(80).optional(),
  dinoEnabled: z.boolean().optional(),
  dinoMessages: z.boolean().optional(),
  confirmDelete: z.boolean().optional(),
  notifyReminders: z.boolean().optional(),
  notifyDaily: z.boolean().optional(),
});

export const getSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UserSettings> => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select nickname, dino_enabled, dino_messages, confirm_delete, notify_reminders, notify_daily
      from user_settings
      where user_id = ${context.userId}
      limit 1
    `;
    return mapRow(rows[0]);
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => Patch.parse(input))
  .handler(async ({ context, data }): Promise<UserSettings> => {
    const current = await getSettings();
    const next: UserSettings = {
      nickname: data.nickname !== undefined ? sanitizeNickname(data.nickname) : current.nickname,
      dinoEnabled: data.dinoEnabled ?? current.dinoEnabled,
      dinoMessages: data.dinoMessages ?? current.dinoMessages,
      confirmDelete: data.confirmDelete ?? current.confirmDelete,
      notifyReminders: data.notifyReminders ?? current.notifyReminders,
      notifyDaily: data.notifyDaily ?? current.notifyDaily,
    };
    const sql = await getSql();
    await sql`
      insert into user_settings (
        user_id, nickname, dino_enabled, dino_messages, confirm_delete, notify_reminders, notify_daily, updated_at
      )
      values (
        ${context.userId}, ${next.nickname || null}, ${next.dinoEnabled}, ${next.dinoMessages},
        ${next.confirmDelete}, ${next.notifyReminders}, ${next.notifyDaily}, now()
      )
      on conflict (user_id) do update set
        nickname = excluded.nickname,
        dino_enabled = excluded.dino_enabled,
        dino_messages = excluded.dino_messages,
        confirm_delete = excluded.confirm_delete,
        notify_reminders = excluded.notify_reminders,
        notify_daily = excluded.notify_daily,
        updated_at = now()
    `;
    return next;
  });
