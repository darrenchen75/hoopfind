create table public.game_participants (
  game_id   uuid not null references public.games (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  status    text not null default 'joined',
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id),
  constraint game_participants_status_check
    check (status in ('joined', 'attended', 'missed'))
);

create index game_participants_user_id_idx
  on public.game_participants (user_id);

alter table public.game_participants enable row level security;

revoke all on public.game_participants from anon;
revoke all on public.game_participants from authenticated;
grant select, insert, delete on public.game_participants to authenticated;
grant update (status) on public.game_participants to authenticated;

create policy "Participants visible on public or owned games"
  on public.game_participants
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.games g
      where g.id = game_participants.game_id
        and (g.is_public = true or g.creator_id = auth.uid())
    )
  );

create policy "Users can join public games as themselves"
  on public.game_participants
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'joined'
    and exists (
      select 1
      from public.games g
      where g.id = game_participants.game_id
        and g.is_public = true
    )
  );

create policy "Users can leave games they joined"
  on public.game_participants
  for delete
  to authenticated
  using (auth.uid() = user_id and status = 'joined');

create policy "Game creators can update participant status"
  on public.game_participants
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.games g
      where g.id = game_participants.game_id
        and g.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.games g
      where g.id = game_participants.game_id
        and g.creator_id = auth.uid()
    )
  );
