# Player Show-up Rate & Past Games — Design

Date: 2026-06-25

## Goal

Surface attendance data already captured by hosts (`game_participants.status`
= `attended` / `missed`) so it stops being dead data:

1. Show each roster member's **show-up rate** on the game detail roster.
2. Give players a **Past games** history section on the dashboard.
3. Show the current user their own all-time **show-up rate** on the dashboard.

## Naming

- **UI label:** "Show-up rate" (also acceptable: "Attendance reliability").
  Never expose the bare word "Reliability" as a user-facing metric name.
- **Code:** the pure helper stays `reliability()` — internal name, kept for
  clean code.

## Metric definition

A participant row has one of three statuses: `joined`, `attended`, `missed`.

- `joined` = future, unjudged, or simply not yet marked by the host. **Never**
  counted as played or missed.
- `decided` = `attended + missed`.
- `pct = Math.round((attended / decided) * 100)`.
- `pct = null` when `decided === 0` → rendered as `New`.

## Components

### 1. Reliability helper — `lib/reliability.ts`

Pure function, no I/O:

```ts
export function reliability(
  attended: number,
  missed: number,
): { pct: number | null; decided: number } {
  const decided = attended + missed;
  const pct = decided === 0 ? null : Math.round((attended / decided) * 100);
  return { pct, decided };
}
```

Tested in `lib/reliability.test.ts` (Vitest, mirrors existing
`lib/match.test.ts` style: `import { describe, it, expect } from "vitest"`).
No assert-based self-checks in production code.

Test cases:
- `(0, 0)` → `{ pct: null, decided: 0 }`
- `(9, 2)` → `{ pct: 82, decided: 11 }` (rounds 81.8 → 82)
- `(1, 0)` → `{ pct: 100, decided: 1 }`
- `(0, 3)` → `{ pct: 0, decided: 3 }`
- `(1, 2)` → `{ pct: 33, decided: 3 }` (rounds 33.3 → 33)

### 2. Roster show-up rate — DB + roster UI

**Migration `009_add_roster_reliability.sql`:** drop and recreate
`public.get_game_roster` (security definer, `set search_path = ''`,
unchanged access rules — caller must be creator or participant).

Add two columns to the returned table:

- `attended_count integer`
- `missed_count integer`

Counts aggregated **inside the definer function** from all-time
`public.game_participants` rows for each rostered `user_id` where status is
`attended` or `missed`. Use `COALESCE(..., 0)` so players with no decided
games return `0, 0`.

Sketch:

```sql
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
      count(*) filter (where all_gp.status = 'attended') as attended_count,
      count(*) filter (where all_gp.status = 'missed')   as missed_count
    from public.game_participants all_gp
    where all_gp.user_id = gp.user_id
  ) stats on true
  where gp.game_id = target_game_id
    and gp.status in ('joined', 'attended')
  order by gp.joined_at asc;
```

**No new RPC.** Roster reliability rides on the existing function.

**Privacy:** the function returns only aggregate `attended_count` /
`missed_count` plus the already-exposed profile fields. It does **not** return
user IDs, past game IDs, dates, locations, raw status rows, emails, or any
other private field. Individual attendance history is never exposed to other
players. The database function remains the final authorization layer.

**`lib/roster.ts`:** extend `RosterEntry` with `attendedCount: number` and
`missedCount: number`; map the two new row fields in `fetchGameRoster`.

**`components/game-roster.tsx`:** per roster row, compute
`reliability(attendedCount, missedCount)` and render a small badge:

- `decided === 0` → `New`
- otherwise → `{pct}% · {decided} marked games`

### 3. Dashboard Past games — `lib/games.ts` + dashboard

**`fetchCurrentUserPastJoinedGames()`** in `lib/games.ts`, mirrors
`fetchCurrentUserPastHostedGames()`:

- current authenticated user only (no user → empty, no error)
- games the user **joined** (participant rows for this user)
- `starts_at < now()`
- order `starts_at` descending
- `limit 6`
- returns each game **plus the current user's own participation status**

Return shape: `{ games: Array<{ game: PickupGame; status: ParticipationStatus }>, error: boolean }`
(or `PickupGame` extended with `myStatus` — decided at implementation, must
carry the per-game status). Status comes from the user's own
`game_participants.status` for that game; no host privileges needed since the
user reads their own rows.

**Dashboard section titled `Past games`**, mirroring the existing
`Past hosted games` block. Each card shows a status badge derived from the
user's own status:

- `attended` → `Played`
- `missed` → `Missed`
- `joined` → `Not marked`

`joined` is counted as neither played nor missed. Canceled games, if returned,
still render with the existing canceled badge.

### 4. Dashboard own show-up rate

A small stat line on the dashboard using the current user's **all-time**
decided attendance — not the 6 displayed past games.

New helper (e.g. `getCurrentUserAttendanceCounts()` in `lib/participation.ts`)
counts the current user's own `game_participants` rows grouped by status
(`attended`, `missed`) across all games. The user reads their own rows
(joined games are public → visible under existing RLS); no new privileged RPC
required.

Feed counts into `reliability()` and render:

- decided > 0 → `Show-up rate: 82% · 9/11 marked games`
- decided === 0 → `Show-up rate: New`

## Out of scope

- Trigger-maintained / denormalized stat columns.
- Minimum-sample hiding (show `New` instead of hiding low-sample players).
- Show-up rate on game **cards** (roster + dashboard only).
- Full attendance history pages / pagination beyond the 6-item dashboard list.
- Notifications.
- Any change to timezone handling.

## Files likely to change

Database-backed:
- `supabase/migrations/009_add_roster_reliability.sql` (new) — recreate
  `get_game_roster` with aggregate counts.

Server/data layer:
- `lib/reliability.ts` (new) — pure helper.
- `lib/reliability.test.ts` (new) — Vitest.
- `lib/roster.ts` — extend `RosterEntry` + mapping.
- `lib/games.ts` — `fetchCurrentUserPastJoinedGames()`.
- `lib/participation.ts` — current-user all-time attendance counts helper.

UI-only:
- `components/game-roster.tsx` — per-row badge.
- `app/dashboard/page.tsx` — `Past games` section + own show-up rate line.
- Possibly a small status-badge presentation in the dashboard / a card variant
  that accepts a status badge (kept minimal, reusing `GameCard` where it fits).

## Manual test cases

1. **Roster badge — new player:** join a game with a brand-new account; on the
   game detail roster the account shows `New`.
2. **Roster badge — decided record:** as host, mark a player `attended` in one
   past game and `missed` in another; their roster badge reads `50% · 2 marked
   games`.
3. **Roster privacy:** confirm the roster response contains no user IDs, game
   IDs, dates, or raw status rows — only counts + profile fields.
4. **Roster access unchanged:** a logged-out user and a logged-in non-member
   still cannot load the roster.
5. **Past games section:** join a game, have the host mark you `attended` after
   it starts; the dashboard `Past games` section shows that game with a
   `Played` badge.
6. **Past games statuses:** verify `missed` → `Missed`, unmarked `joined` past
   game → `Not marked`.
7. **Past games limit/order:** with 7+ past joined games, only the 6 most
   recent (by `starts_at` desc) appear.
8. **Own show-up rate:** with 9 attended / 2 missed all-time, dashboard reads
   `Show-up rate: 82% · 9/11 marked games`.
9. **Own show-up rate — none:** account with no decided games reads
   `Show-up rate: New`.
10. **All-time, not displayed-six:** a user with 8 attended past games (only 6
    shown as cards) still shows `8/8` (or the true all-time total) in the
    show-up rate, proving it is not derived from the 6 cards.
