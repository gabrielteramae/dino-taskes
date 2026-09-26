create table if not exists user_prefs (
  user_id text primary key,
  display_name text not null default '',
  dino_talks boolean not null default true,
  dino_small boolean not null default false,
  confirm_delete boolean not null default false,
  notify_done boolean not null default true,
  notify_dino boolean not null default true,
  updated_at timestamptz not null default now()
);
