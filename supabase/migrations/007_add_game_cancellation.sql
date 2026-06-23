alter table public.games
  add column canceled_at timestamptz;

-- Tighten the update policy: a creator may only edit/cancel a game that has not
-- started and is not already canceled. USING gates the pre-update row (so a
-- started or canceled game is unwritable); WITH CHECK only re-asserts ownership,
-- which lets the cancel write set canceled_at while still blocking edits once a
-- game is canceled (the next update's USING sees canceled_at is not null).
drop policy "Users can update their own games" on public.games;

create policy "Users can update their own upcoming games"
  on public.games
  for update
  to authenticated
  using (
    auth.uid() = creator_id
    and starts_at > now()
    and canceled_at is null
  )
  with check (auth.uid() = creator_id);

create or replace function public.join_game(target_game_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_game     public.games%rowtype;
  active_count    integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into target_game
  from public.games
  where id = target_game_id
  for update;

  if not found then
    raise exception 'Game not found';
  end if;

  if not target_game.is_public then
    raise exception 'This game is not public';
  end if;

  if target_game.starts_at <= now() then
    raise exception 'This game has already started';
  end if;

  if target_game.canceled_at is not null then
    raise exception 'This game has been canceled';
  end if;

  if exists (
    select 1
    from public.game_participants
    where game_id = target_game_id
      and user_id = current_user_id
  ) then
    raise exception 'You have already joined this game';
  end if;

  select count(*) into active_count
  from public.game_participants
  where game_id = target_game_id
    and status in ('joined', 'attended');

  if active_count >= target_game.max_players then
    raise exception 'This game is full';
  end if;

  insert into public.game_participants (game_id, user_id, status)
  values (target_game_id, current_user_id, 'joined');
end;
$$;

revoke all on function public.join_game(uuid) from public, anon;
grant execute on function public.join_game(uuid) to authenticated;
