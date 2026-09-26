create table if not exists user_settings (
  user_id text primary key,
  nickname text,
  dino_enabled boolean not null default true,
  dino_messages boolean not null default true,
  confirm_delete boolean not null default false,
  notify_reminders boolean not null default false,
  notify_daily boolean not null default false,
  updated_at timestamptz not null default now()
);
