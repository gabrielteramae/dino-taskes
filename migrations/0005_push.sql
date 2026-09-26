create table if not exists push_config (
  id integer primary key,
  public_key text not null,
  private_key text not null
);

create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id text not null,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);
