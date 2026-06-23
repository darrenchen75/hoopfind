drop policy if exists "Users can create their own games" on public.games;

create policy "Users can create their own games"
  on public.games
  for insert
  to authenticated
  with check (
    auth.uid() = creator_id
    and starts_at > now()
  );

drop policy if exists "Users can update their own upcoming games" on public.games;

create policy "Users can update their own upcoming games"
  on public.games
  for update
  to authenticated
  using (
    auth.uid() = creator_id
    and starts_at > now()
    and canceled_at is null
  )
  with check (
    auth.uid() = creator_id
    and starts_at > now()
  );
