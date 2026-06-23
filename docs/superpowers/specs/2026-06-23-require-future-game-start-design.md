# Require a future start time for games

**Date:** 2026-06-23
**Status:** Approved design

## Problem

A host can create a game with a start time in the past, or edit an existing
game's start time to the past. The current validation (`validate` in
`lib/game-fields.ts`) only checks that the date/time is *parseable*, never that
it is in the future. A past-dated game immediately satisfies
`isGameStarted(starts_at)` (`starts_at <= now()`), so it is treated as already
started: it drops into the "past hosted games" bucket on the dashboard and joins
are rejected. The game effectively "auto-starts" the moment it is created.

## Goal

Reject any game whose start time is at or before now, on both create and edit,
at two layers: the shared client validation (friendly message, normal path) and
the database (backstop for any write that bypasses the form).

## Decisions

- **Boundary:** strictly future — `starts_at > now()`. Matches the existing
  `isGameStarted` boundary (`starts_at <= now()`) exactly. No minimum lead time.
- **Enforcement:** client `validate()` **and** database RLS `WITH CHECK`.
- **DB mechanism:** extend the existing RLS policies' `WITH CHECK` (not a
  trigger). The friendly error comes from the client path, which always runs
  first; the RLS check only fires on non-form writes, where a generic Postgres
  error is acceptable.
- **Existing data:** untouched. Genuinely-past games already belong in the past
  bucket; no data migration.

## Scope

### In scope

- A future-start check in `lib/game-fields.ts` `validate`.
- A migration recreating the games insert and update policies with
  `starts_at > now()` added to their `WITH CHECK`.
- Unit tests for the new validation case.

### Out of scope

- Timezone correctness of `starts_at` (the separate, pre-existing follow-up where
  the edit page splits/reconstructs across server/browser TZ). This fix compares
  consistently within each layer (browser-local on the client, UTC `now()` vs
  stored UTC in the DB) and does not change TZ handling.
- Any minimum lead-time requirement.
- Cleaning up or migrating existing past-dated rows.

## Changes

### 1. `lib/game-fields.ts` — client validation (edit)

In `validate`, immediately after the existing parseable check (the
`Number.isNaN(startsAt.getTime())` block), add:

```ts
if (startsAt.getTime() <= Date.now()) {
  return "The game must start in the future.";
}
```

`startsAt` is already computed as `new Date(`${fields.date}T${fields.time}`)`
(browser-local); `Date.now()` is the same clock, so the comparison is internally
consistent. Because `validate` runs inside `handleSubmit` at submit time, a form
left open until its own chosen time has passed is also caught. This single change
covers both the create form and the edit form (both call `validate`).

### 2. `supabase/migrations/008_require_future_start.sql` — DB backstop (new)

`WITH CHECK` validates the **new** row's `starts_at`, so both inserting a past
game and editing an upcoming game to a past time are rejected. Recreate both
policies (drop + create, matching the project's existing migration style).

**Insert policy** (originally `002`, `"Users can create their own games"`):

```sql
drop policy "Users can create their own games" on public.games;

create policy "Users can create their own games"
  on public.games
  for insert
  to authenticated
  with check (
    auth.uid() = creator_id
    and starts_at > now()
  );
```

**Update policy** (currently `007`, `"Users can update their own upcoming
games"`): keep its existing `USING` (creator owns it, not started, not canceled)
and add the future-start guard to `WITH CHECK`:

```sql
drop policy "Users can update their own upcoming games" on public.games;

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
```

**Cancel still works:** canceling is an update that sets `canceled_at` without
moving `starts_at`. The new `WITH CHECK` requires the (unchanged, still-future)
`starts_at > now()`, which holds because cancel is only possible before start
(the `USING` clause already requires it).

## Testing

- Unit tests in `lib/game-fields.test.ts` (vitest), extending the existing
  `validate` suite:
  - A `GameFields` with a past date/time returns `"The game must start in the
    future."`.
  - The existing fully-valid fixture (date `2030-01-01`) still returns `null`
    (guards against an off-by-one that would reject valid future games).
- Manual checks (after applying migration 008 to the database):
  - Create form rejects a past date/time with the friendly message.
  - Edit form rejects changing a game to a past time.
  - A direct `insert`/`update` of a past `starts_at` (bypassing the form) is
    rejected by RLS.
  - Canceling an upcoming game still succeeds.

## Rollout note

Migration 008 must be applied to the database for the backstop to take effect;
the client check works without it. (Migration 007 also still needs applying if it
has not been — same database step.)
