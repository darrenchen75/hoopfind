-- get_game_roster gains all-time attended/missed counts per rostered player so
-- the UI can show a show-up rate. The return-table shape changes, so the
-- function must be dropped and recreated (create or replace cannot alter OUT
-- columns). Authorization rules are unchanged: caller must be the game creator
-- or have a participation row for the game.
drop function if exists public.get_game_roster(uuid);

create function public.get_game_roster(target_game_id uuid)
  returns table (
    display_name     text,
    skill_level      text,
    primary_position text,
    play_style       text,
    attended_count   integer,
    missed_count     integer
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
      p.play_style,
      coalesce(stats.attended_count, 0)::integer,
      coalesce(stats.missed_count, 0)::integer
    from public.game_participants gp
    left join public.profiles p on p.id = gp.user_id
    left join lateral (
      select
        count(*) filter (where ap.status = 'attended') as attended_count,
        count(*) filter (where ap.status = 'missed')   as missed_count
      from public.game_participants ap
      where ap.user_id = gp.user_id
    ) stats on true
    where gp.game_id = target_game_id
      and gp.status in ('joined', 'attended')
    order by gp.joined_at asc;
end;
$$;

revoke all on function public.get_game_roster(uuid) from public, anon;
grant execute on function public.get_game_roster(uuid) to authenticated;
