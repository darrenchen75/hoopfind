-- Tighten participant visibility: the old SELECT policy let any authenticated
-- user read every participant row (user ids, statuses, join times) for all
-- public games. Replace it with two narrower policies. RLS stays enabled and
-- all other grants/policies/functions are left untouched.
drop policy "Participants visible on public or owned games" on public.game_participants;

-- Regular users may read only their own participation row.
create policy "Users can view their own participation"
  on public.game_participants
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Game creators may read the full participant list for games they created;
-- they need it for later attendance management (marking attended/missed).
create policy "Game creators can view their participants"
  on public.game_participants
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.games g
      where g.id = game_participants.game_id
        and g.creator_id = auth.uid()
    )
  );

-- Public participant counts continue to come from the aggregate
-- get_public_game_participant_counts function (SECURITY DEFINER), so public
-- views still show totals without any direct table read or identity exposure.
