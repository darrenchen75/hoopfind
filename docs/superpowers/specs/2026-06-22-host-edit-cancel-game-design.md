# Host edit & cancel game

**Date:** 2026-06-22
**Status:** Approved design

## Problem

A host creates a game, then their plans change — wrong time, moved court, or
they can't make it at all. Today there is no way to edit or cancel a posted
game. The result is **ghost games**: stale or abandoned runs that still sit in
the browse list and that joined players show up to expecting a game.

## Goal

Let a game's creator edit its details or cancel it, before it starts. Canceling
is **soft and visible** — the game is not deleted; joined players see a clear
`CANCELED` marker so they actually find out, instead of arriving at an empty
court.

## Scope

### In scope

- Creator edits any game field (title, location, area, date/time, type, max
  players, competitiveness, skill range, notes) via an edit page.
- Creator cancels a game (sets `canceled_at`); canceled games show a `CANCELED`
  state and reject new joins.
- Edit and cancel are allowed **only before `starts_at`** (consistent with how
  join/leave already gate on started games).
- Extract the create form into a shared `GameForm` used by both create and edit.

### Out of scope (add later if wanted)

- Notifications / emails to joined players on edit or cancel (no notification
  system exists yet).
- Un-canceling a game.
- Hard delete of games.
- Kicking joined players when `max_players` is lowered.

## Cancel model — soft `canceled_at` flag

Add a nullable `canceled_at timestamptz` to `games` (null = live, set = canceled).
Chosen over hard delete because deleting silently vanishes the game and
reintroduces the ghost-game problem for players who already joined. Chosen over
reusing `is_public=false` because the games SELECT policy is `using(is_public =
true)` — flipping it would make even the creator 404 their own game and leaves no
way to render a "canceled" state.

A canceled game stays `is_public = true`, so existing visibility still works; the
canceled *state* is carried by `canceled_at`.

### Visibility rules

| Surface | Behavior for canceled games |
|---|---|
| Browse `/games` | **Excluded** — keeps the public list clean. |
| Game detail `/games/[id]` | **Shown** with a `CANCELED` banner; join disabled. |
| Dashboard "your games" (joined) | **Kept**, with `CANCELED` badge — this is how a joined player finds out. |
| Dashboard hosted (upcoming) | **Kept**, with `CANCELED` badge. |

## Write paths

Both edit and cancel are creator-only writes to the creator's own `games` row.
The existing RLS policy `"Users can update their own games"` (`with check
auth.uid() = creator_id`) already permits these, so both use a **direct client
`.update()`** — the same pattern create already uses for `insert`. No new RPC.

The one server-side function change is `join_game`, which must reject canceled
games (see migration below).

## Components & changes

### 1. Migration `supabase/migrations/007_add_game_cancellation.sql` (new)

- `alter table public.games add column canceled_at timestamptz;`
- Replace `public.join_game` (via `create or replace function`) to add, after the
  "already started" check:

  ```sql
  if target_game.canceled_at is not null then
    raise exception 'This game has been canceled';
  end if;
  ```

  No grant changes (re-create keeps existing grants; re-assert
  `grant execute ... to authenticated` to be safe). No new policy — edit/cancel
  ride the existing update policy.

### 2. `lib/games.ts` (edit)

- `GameRow` gains `canceled_at: string | null`; add `canceled_at` to
  `GAME_COLUMNS`.
- `PickupGame` (in `lib/types.ts`) gains `isCanceled: boolean`.
- `mapGameRow` sets `isCanceled: row.canceled_at !== null`.
- `fetchPublicGames` adds `.is("canceled_at", null)` — browse excludes canceled.
- `fetchCurrentUserJoinedGames` and `fetchCurrentUserHostedGames` keep canceled
  games (no filter change) so the badge can show.
- Add `fetchGameForEdit(id)` returning the raw editable row for the creator. It
  fetches by id and returns the row only when `creator_id === current user`;
  otherwise `null`. Used by the edit page to guard + prefill.

### 3. `lib/game-fields.ts` — shared form fields, defaults, validation (new)

Extract the `GameFields` type, `gameTypes` / `competitivenessLevels` /
`skillLevels` constants, `emptyGame`, and the `validate(fields)` logic currently
inline in `create-game-form.tsx`. `validate` is the only non-trivial logic, so it
gets unit tests (`lib/game-fields.test.ts`). Also export
`fieldsToRow(fields, creatorId?)` building the DB payload (`starts_at` from
date+time, trimmed strings, `notes || null`). (Named `game-fields` to avoid a
base-name collision with the `game-form` component.)

### 4. `components/game-form.tsx` — shared form component (new)

Refactored from `create-game-form.tsx`. `"use client"`.

- Props: `{ mode: "create" | "edit"; gameId?: string; initial?: GameFields }`.
- Holds `fields` state seeded from `initial ?? emptyGame`.
- Submit:
  - `create` → `supabase.from("games").insert(fieldsToRow(fields, userId))`,
    then `router.push("/dashboard")`.
  - `edit` → `supabase.from("games").update(fieldsToRow(fields)).eq("id",
    gameId)`, then `router.push(\`/games/${gameId}\`)` + `router.refresh()`.
- Submit button label and success copy switch on `mode`
  (`Create game` / `Save changes`).
- Validation via `validate(fields)` from `lib/game-fields.ts`.
- Keeps the existing auth gate (logged-out message) for the create case; the edit
  page guards on the server, so edit can assume an authenticated creator.

### 5. `components/create-game-form.tsx` (delete)

Update `app/games/new/page.tsx` to render `<GameForm mode="create" />` directly
and delete `create-game-form.tsx`. Fewer files; no thin wrapper.

### 6. `app/games/[id]/edit/page.tsx` (new route)

Server component:

- `await params`, validate `isUuid`, else `notFound()`.
- `const row = await fetchGameForEdit(id)`. If `null` → `notFound()` (not creator
  or missing).
- If the game has started or is canceled → redirect to `/games/${id}` (nothing to
  edit).
- Convert the row to `GameFields` (split `starts_at` into `date` + `time`) and
  render `<GameForm mode="edit" gameId={id} initial={fields} />` inside the
  standard page chrome (`SiteHeader`, back link).

### 7. `components/cancel-game-button.tsx` (new)

`"use client"`. Props: `{ gameId: string }`.

- Two-step confirm (click "Cancel game" → "Are you sure? This can't be undone" →
  confirm), no extra deps.
- On confirm: `supabase.from("games").update({ canceled_at: new Date()
  .toISOString() }).eq("id", gameId)`, then `router.refresh()`.
- Surfaces any error via the shared `errorPanel` class.

### 8. `app/games/[id]/page.tsx` (edit)

- When `isCreator && !hasStarted && !game.isCanceled`: render an **Edit game**
  link (`/games/${id}/edit`) and the `<CancelGameButton gameId={id} />`, placed
  near the participation block.
- When `game.isCanceled`: render a `CANCELED` banner near the title and do **not**
  render the join/leave button (replace with a short "This game was canceled by
  the host." line).

### 9. `components/game-card.tsx` (edit) + dashboard

- Add an optional `CANCELED` badge to the card, reusing the existing badge slot
  pattern (same place the match badge renders). Shown when `game.isCanceled`.
- Dashboard joined + hosted lists pass games through unchanged; the card shows the
  badge. No query change needed there.

## Edge cases

- **Lowering `max_players` below current count:** allowed. No one is kicked;
  `join_game` already blocks new joins while `active_count >= max_players`, so
  this is safe. (Documented, not enforced.)
- **Editing to a past `starts_at`:** the shared `validate` only checks the
  date/time is parseable (parity with current create behavior). Not tightened
  here.
- **Race: game starts between page load and submit:** the update still writes, but
  the next render shows it started; low stakes, not guarded beyond the page-level
  `hasStarted` redirect.
- **Non-creator hits `/games/[id]/edit`:** `fetchGameForEdit` returns `null` →
  `notFound()`. RLS also blocks the write regardless.

## Testing

- Unit tests `lib/game-form.test.ts` (vitest) for `validate`:
  - Missing required field returns its message.
  - Non-positive / non-integer `max_players` rejected.
  - `max_skill_level` below `min_skill_level` rejected.
  - Unparseable date/time rejected.
  - A fully valid `GameFields` returns `null`.
- Manual checks:
  - Creator sees Edit + Cancel on their own un-started game; non-creator does not.
  - Editing time/notes updates the detail page.
  - Canceling shows the banner, removes the game from `/games`, disables join, and
    shows a `CANCELED` badge on the canceling player's and joined players'
    dashboards.
  - `join_game` RPC errors with "This game has been canceled" on a canceled game.
  - Edit/cancel controls disappear once the game has started.
