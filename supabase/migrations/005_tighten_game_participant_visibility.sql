drop policy "Participants visible on public or owned games" on public.game_participants;

create policy "Users can view their own participation"
  on public.game_participants
  for select
  to authenticated
  using (auth.uid() = user_id);

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
