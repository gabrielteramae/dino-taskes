alter table tasks add column if not exists category text not null default 'estudo';
alter table tasks add column if not exists priority text not null default 'normal';
alter table tasks add column if not exists due_at timestamptz;
alter table tasks add column if not exists sort_order integer not null default 0;

create table if not exists user_streaks (
  user_id text primary key,
  current_streak integer not null default 0,
  last_clear_date date
);
