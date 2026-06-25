-- Court-local timezone for each game. Kept default so inserts that predate the
-- app code change (or omit the column) still succeed instead of failing not-null.
alter table public.games
  add column timezone text not null default 'America/New_York';
