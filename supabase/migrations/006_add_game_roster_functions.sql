create function public.get_game_roster(target_game_id uuid)
  returns table (
    display_name     text,
    skill_level      text,
    primary_position text,
    play_style       text
  )
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.games g where g.id = target_game_id) then
    raise exception 'Game not found';
  end if;

  if not exists (
    select 1 from public.games g
    where g.id = target_game_id and g.creator_id = current_user_id
  ) and not exists (
    select 1 from public.game_participants gp
    where gp.game_id = target_game_id and gp.user_id = current_user_id
  ) then
    raise exception 'You must join this game to view the roster';
  end if;

  return query
    select
      coalesce(nullif(p.display_name, ''), 'Player'),
      p.skill_level,
      p.primary_position,
      p.play_style
    from public.game_participants gp
    left join public.profiles p on p.id = gp.user_id
    where gp.game_id = target_game_id
      and gp.status in ('joined', 'attended')
    order by gp.joined_at asc;
end;
$$;

revoke all on function public.get_game_roster(uuid) from public, anon;
grant execute on function public.get_game_roster(uuid) to authenticated;

create function public.get_host_game_participants(target_game_id uuid)
  returns table (
    user_id      uuid,
    display_name text,
    status       text
  )
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.games g where g.id = target_game_id) then
    raise exception 'Game not found';
  end if;

  if not exists (
    select 1 from public.games g
    where g.id = target_game_id and g.creator_id = current_user_id
  ) then
    raise exception 'Only the game creator can view attendance details';
  end if;

  return query
    select
      gp.user_id,
      coalesce(nullif(p.display_name, ''), 'Player'),
      gp.status
    from public.game_participants gp
    left join public.profiles p on p.id = gp.user_id
    where gp.game_id = target_game_id
    order by gp.joined_at asc;
end;
$$;

revoke all on function public.get_host_game_participants(uuid) from public, anon;
grant execute on function public.get_host_game_participants(uuid) to authenticated;

create function public.set_participant_attendance(
  target_game_id uuid,
  target_user_id uuid,
  new_status text
)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_game     public.games%rowtype;
  updated_count   integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if new_status is null or new_status not in ('attended', 'missed') then
    raise exception 'Attendance status must be attended or missed';
  end if;

  select * into target_game
  from public.games
  where id = target_game_id
  for update;

  if not found then
    raise exception 'Game not found';
  end if;

  if target_game.creator_id <> current_user_id then
    raise exception 'Only the game creator can update attendance';
  end if;

  if target_game.starts_at > now() then
    raise exception 'Attendance cannot be updated before the game starts';
  end if;

  update public.game_participants
  set status = new_status
  where game_id = target_game_id
    and user_id = target_user_id;

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    raise exception 'Participant not found for this game';
  end if;
end;
$$;

revoke all on function public.set_participant_attendance(uuid, uuid, text)
  from public, anon;
grant execute on function public.set_participant_attendance(uuid, uuid, text)
  to authenticated;

revoke update (status) on public.game_participants from authenticated;
drop policy "Game creators can update participant status" on public.game_participants;
