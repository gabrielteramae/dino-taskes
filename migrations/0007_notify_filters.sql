alter table user_prefs add column if not exists notify_filters text not null default '';
