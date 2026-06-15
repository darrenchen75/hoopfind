create function public.join_game(target_game_id uuid)
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

create function public.leave_game(target_game_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_game     public.games%rowtype;
  deleted_count   integer;
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

  if target_game.starts_at <= now() then
    raise exception 'You can no longer leave after the game has started';
  end if;

  delete from public.game_participants
  where game_id = target_game_id
    and user_id = current_user_id
    and status = 'joined';

  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    raise exception 'You do not have an active joined reservation for this game';
  end if;
end;
$$;

create function public.get_public_game_participant_counts()
  returns table (game_id uuid, participant_count bigint)
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select gp.game_id, count(*) as participant_count
  from public.game_participants gp
  join public.games g on g.id = gp.game_id
  where g.is_public = true
    and gp.status in ('joined', 'attended')
  group by gp.game_id;
$$;

revoke insert, delete on public.game_participants from authenticated;

drop policy "Users can join public games as themselves" on public.game_participants;
drop policy "Users can leave games they joined" on public.game_participants;

revoke all on function public.join_game(uuid) from public, anon;
grant execute on function public.join_game(uuid) to authenticated;

revoke all on function public.leave_game(uuid) from public, anon;
grant execute on function public.leave_game(uuid) to authenticated;

revoke all on function public.get_public_game_participant_counts() from public;
grant execute on function public.get_public_game_participant_counts() to anon, authenticated;
