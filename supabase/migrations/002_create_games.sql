create table public.games (
  id              uuid primary key default gen_random_uuid(),
  creator_id      uuid not null references auth.users (id) on delete cascade,
  title           text not null,
  location_name   text not null,
  area            text not null,
  starts_at       timestamptz not null,
  game_type       text not null,
  max_players     integer not null,
  competitiveness text not null,
  min_skill_level text not null,
  max_skill_level text not null,
  notes           text,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint games_max_players_positive check (max_players > 0)
);

alter table public.games enable row level security;

grant select on public.games to anon, authenticated;
grant insert, update on public.games to authenticated;

create policy "Anyone can view public games"
  on public.games
  for select
  to anon, authenticated
  using (is_public = true);

create policy "Users can create their own games"
  on public.games
  for insert
  to authenticated
  with check (auth.uid() = creator_id);

create policy "Users can update their own games"
  on public.games
  for update
  to authenticated
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create function public.set_games_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger games_set_updated_at
  before update on public.games
  for each row
  execute function public.set_games_updated_at();
