# Player Show-up Rate & Past Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface captured attendance data as a player "show-up rate" on the game roster, plus a dashboard "Past games" history with the user's own all-time show-up rate.

**Architecture:** A pure `reliability()` helper computes percentage/decided counts. Migration 009 recreates the `get_game_roster` security-definer function to also return all-time `attended_count` / `missed_count` per player. The dashboard gets a past-joined-games data function and an all-time attendance-count helper, both reading the current user's own rows. UI changes are a roster badge and two dashboard additions.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + RLS + RPC), TypeScript, Vitest.

## Global Constraints

- UI label for the metric is **"Show-up rate"** (or "Attendance reliability"). Never show the bare word "Reliability" to users. Code helper named `reliability()` is fine.
- `decided = attended + missed`; `pct = Math.round((attended / decided) * 100)`; `pct = null` when `decided === 0`.
- `joined` status = future/unjudged/unmarked — never counted as played or missed.
- Privacy: roster exposes only aggregate counts + percentage. No user IDs, game IDs, dates, locations, or raw attendance history exposed to other players. DB functions are the final authorization layer.
- Roster access unchanged: caller must be the game creator OR have a participation row for that game.
- Never render raw Supabase error text to users.
- Supabase server client `createClient()` is **async** — always `await`.
- Commit messages: lowercase imperative, `<action> <change>`.

---

### Task 1: Reliability helper

**Files:**
- Create: `lib/reliability.ts`
- Test: `lib/reliability.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `reliability(attended: number, missed: number): { pct: number | null; decided: number }`

- [ ] **Step 1: Write the failing test**

Create `lib/reliability.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { reliability } from "./reliability";

describe("reliability", () => {
  it("returns null pct and zero decided when no decided games", () => {
    expect(reliability(0, 0)).toEqual({ pct: null, decided: 0 });
  });

  it("rounds the percentage to the nearest whole number", () => {
    expect(reliability(9, 2)).toEqual({ pct: 82, decided: 11 }); // 81.8 -> 82
  });

  it("returns 100 for a perfect record", () => {
    expect(reliability(1, 0)).toEqual({ pct: 100, decided: 1 });
  });

  it("returns 0 when every decided game was missed", () => {
    expect(reliability(0, 3)).toEqual({ pct: 0, decided: 3 });
  });

  it("rounds a one-third record down", () => {
    expect(reliability(1, 2)).toEqual({ pct: 33, decided: 3 }); // 33.3 -> 33
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reliability`
Expected: FAIL — cannot find module `./reliability`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/reliability.ts`:

```ts
// "Show-up rate" = share of a player's host-marked games they actually attended.
// `joined` rows are excluded: they are future, unjudged, or simply unmarked.
export function reliability(
  attended: number,
  missed: number,
): { pct: number | null; decided: number } {
  const decided = attended + missed;
  const pct = decided === 0 ? null : Math.round((attended / decided) * 100);
  return { pct, decided };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reliability`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/reliability.ts lib/reliability.test.ts
git commit -m "add reliability helper"
```

---

### Task 2: Migration — roster reliability counts

**Files:**
- Create: `supabase/migrations/009_add_roster_reliability.sql`

**Interfaces:**
- Consumes: existing `public.game_participants`, `public.games`, `public.profiles`.
- Produces: `public.get_game_roster(target_game_id uuid)` returning columns `display_name text, skill_level text, primary_position text, play_style text, attended_count integer, missed_count integer`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/009_add_roster_reliability.sql`:

```sql
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
```

- [ ] **Step 2: Apply the migration**

Run it against the Supabase project (SQL editor or `supabase db push`, per the project's normal flow). Expected: no error; function recreated.

- [ ] **Step 3: Manually verify in SQL**

As a user who is a participant or creator of a game, call:
`select * from public.get_game_roster('<game-uuid>');`
Expected: rows include `attended_count` and `missed_count` integer columns; players with no decided games show `0, 0`. No user IDs / game IDs / dates in the output.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/009_add_roster_reliability.sql
git commit -m "add roster attendance counts function"
```

---

### Task 3: Roster data layer

**Files:**
- Modify: `lib/roster.ts`

**Interfaces:**
- Consumes: `get_game_roster` RPC (Task 2) with new `attended_count` / `missed_count` columns.
- Produces: `RosterEntry` extended with `attendedCount: number; missedCount: number`. `fetchGameRoster` unchanged signature: `(gameId: string) => Promise<{ roster: RosterEntry[]; error: boolean }>`.

- [ ] **Step 1: Extend the `RosterEntry` interface and row type**

In `lib/roster.ts`, change the `RosterEntry` interface (currently lines 7-12) to:

```ts
export interface RosterEntry {
  displayName: string;
  skillLevel: string | null;
  primaryPosition: string | null;
  playStyle: string | null;
  attendedCount: number;
  missedCount: number;
}
```

And change the `RosterRow` type (currently lines 20-25) to:

```ts
type RosterRow = {
  display_name: string | null;
  skill_level: string | null;
  primary_position: string | null;
  play_style: string | null;
  attended_count: number | null;
  missed_count: number | null;
};
```

- [ ] **Step 2: Map the new fields in `fetchGameRoster`**

Replace the `.map(...)` in `fetchGameRoster` (currently lines 45-50) with:

```ts
  const roster = ((data as RosterRow[] | null) ?? []).map((r) => ({
    displayName: r.display_name ?? "Player",
    skillLevel: r.skill_level,
    primaryPosition: r.primary_position,
    playStyle: r.play_style,
    attendedCount: Number(r.attended_count ?? 0),
    missedCount: Number(r.missed_count ?? 0),
  }));
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run lint`
Expected: no errors in `lib/roster.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/roster.ts
git commit -m "map roster attendance counts"
```

---

### Task 4: Roster show-up rate badge

**Files:**
- Modify: `components/game-roster.tsx`

**Interfaces:**
- Consumes: `RosterEntry.attendedCount` / `.missedCount` (Task 3), `reliability()` (Task 1).
- Produces: visual badge only.

- [ ] **Step 1: Import the helper**

In `components/game-roster.tsx`, add to the imports at the top:

```ts
import { reliability } from "@/lib/reliability";
```

- [ ] **Step 2: Render the show-up rate per roster row**

Replace the roster `<ul>...</ul>` block (currently lines 36-49) with:

```tsx
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {roster.map((entry, i) => {
        const { pct, decided } = reliability(
          entry.attendedCount,
          entry.missedCount,
        );
        const showUp =
          decided === 0 ? "New" : `${pct}% · ${decided} marked games`;
        return (
          <li key={i} className="border-2 border-ink bg-paper p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold text-ink">
                {entry.displayName}
              </p>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  Show-up rate
                </p>
                <p className="text-sm font-semibold text-ink">{showUp}</p>
              </div>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              <Field label="Skill level" value={entry.skillLevel} />
              <Field label="Position" value={entry.primaryPosition} />
              <Field label="Play style" value={entry.playStyle} />
            </dl>
          </li>
        );
      })}
    </ul>
  );
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manually verify**

Run `npm run dev`, open a game detail page as a joined member. Expected: each roster row shows a "Show-up rate" badge reading `New` (no decided games) or e.g. `50% · 2 marked games`. Then stop the dev server (kill the port).

- [ ] **Step 5: Commit**

```bash
git add components/game-roster.tsx
git commit -m "show roster show-up rate badge"
```

---

### Task 5: Past joined games data function

**Files:**
- Modify: `lib/games.ts`

**Interfaces:**
- Consumes: `GAME_COLUMNS`, `GameRow`, `mapGameRow`, `getCurrentUserId`, `fetchParticipantCounts` (all already in `lib/games.ts`), plus `toParticipationStatus` and `ParticipationStatus` from `lib/participation`.
- Produces: `fetchCurrentUserPastJoinedGames(): Promise<{ games: { game: PickupGame; status: ParticipationStatus }[]; error: boolean }>`

- [ ] **Step 1: Add the participation imports**

In `lib/games.ts`, change the existing participation import (currently line 3) from:

```ts
import { fetchParticipantCounts, getJoinedGameIds } from "@/lib/participation";
```

to:

```ts
import {
  fetchParticipantCounts,
  getJoinedGameIds,
  toParticipationStatus,
  type ParticipationStatus,
} from "@/lib/participation";
```

- [ ] **Step 2: Add the function**

Append to `lib/games.ts` (after `fetchCurrentUserPastHostedGames`):

```ts
// The user's 6 most recent past games they participated in, with their own
// status. Reads the user's own game_participants rows (all statuses), so it
// must NOT reuse getJoinedGameIds() — that helper returns only currently
// joined rows and would drop past attended/missed games.
export async function fetchCurrentUserPastJoinedGames(): Promise<{
  games: { game: PickupGame; status: ParticipationStatus }[];
  error: boolean;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { games: [], error: false };
  }

  const supabase = await createClient();

  const { data: partData, error: partError } = await supabase
    .from("game_participants")
    .select("game_id, status")
    .eq("user_id", userId);

  if (partError) {
    return { games: [], error: true };
  }

  const statusByGame = new Map<string, ParticipationStatus>();
  for (const row of partData as { game_id: string; status: string }[]) {
    const status = toParticipationStatus(row.status);
    if (status) {
      statusByGame.set(row.game_id, status);
    }
  }

  if (statusByGame.size === 0) {
    return { games: [], error: false };
  }

  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .in("id", [...statusByGame.keys()])
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(6);

  if (error) {
    return { games: [], error: true };
  }

  const counts = await fetchParticipantCounts();

  return {
    games: (data as GameRow[]).map((row) => ({
      game: mapGameRow(row, counts.get(row.id) ?? 0),
      // Non-null: every returned game id came from statusByGame.
      status: statusByGame.get(row.id)!,
    })),
    error: false,
  };
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run lint`
Expected: no errors. (`PickupGame` is already imported in `lib/games.ts`.)

- [ ] **Step 4: Commit**

```bash
git add lib/games.ts
git commit -m "add past joined games fetch"
```

---

### Task 6: Current-user all-time attendance counts

**Files:**
- Modify: `lib/participation.ts`

**Interfaces:**
- Consumes: `getCurrentUserId`, `createClient` (already imported in `lib/participation.ts`).
- Produces: `getCurrentUserAttendanceCounts(): Promise<{ attended: number; missed: number; error: boolean }>`

- [ ] **Step 1: Add the function**

Append to `lib/participation.ts`:

```ts
export interface AttendanceCounts {
  attended: number;
  missed: number;
  error: boolean;
}

// All-time decided attendance for the current user, counted from their own
// game_participants rows — not from any 6-item display list.
export async function getCurrentUserAttendanceCounts(): Promise<AttendanceCounts> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { attended: 0, missed: 0, error: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_participants")
    .select("status")
    .eq("user_id", userId)
    .in("status", ["attended", "missed"]);

  if (error) {
    return { attended: 0, missed: 0, error: true };
  }

  let attended = 0;
  let missed = 0;
  for (const row of data as { status: string }[]) {
    if (row.status === "attended") {
      attended += 1;
    } else if (row.status === "missed") {
      missed += 1;
    }
  }
  return { attended, missed, error: false };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/participation.ts
git commit -m "add current user attendance counts"
```

---

### Task 7: Dashboard — past games + own show-up rate

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `reliability()` (Task 1), `fetchCurrentUserPastJoinedGames()` (Task 5), `getCurrentUserAttendanceCounts()` (Task 6), existing `GameCard`.
- Produces: UI only.

- [ ] **Step 1: Add imports**

In `app/dashboard/page.tsx`, add `fetchCurrentUserPastJoinedGames` to the existing `@/lib/games` import block, and add:

```ts
import { getCurrentUserAttendanceCounts } from "@/lib/participation";
import { reliability } from "@/lib/reliability";
```

- [ ] **Step 2: Fetch the new data**

Add two entries to the `Promise.all([...])` destructuring (currently lines 15-27). Add to the destructured array:

```ts
    { games: pastJoinedGames, error: pastJoinedError },
    attendance,
```

and to the promises array:

```ts
    fetchCurrentUserPastJoinedGames(),
    getCurrentUserAttendanceCounts(),
```

(Keep destructuring order aligned with promise order.)

- [ ] **Step 3: Compute the show-up rate line**

After `const displayName = profile?.displayName;` (line 28), add:

```ts
  const { pct, decided } = reliability(attendance.attended, attendance.missed);
  const showUpText = attendance.error
    ? null
    : decided === 0
      ? "Show-up rate: New"
      : `Show-up rate: ${pct}% · ${attendance.attended}/${decided} marked games`;
```

- [ ] **Step 4: Render the show-up rate under the welcome copy**

Immediately after the welcome `<p className="mt-4 max-w-2xl text-lg leading-8 text-muted">...</p>` (the "Browse upcoming public runs..." paragraph, lines 43-45), add:

```tsx
            {showUpText && (
              <p className="mt-3 text-sm font-bold uppercase tracking-wide text-vermilion-ink">
                {showUpText}
              </p>
            )}
```

- [ ] **Step 5: Add the Past games section**

Immediately before the closing `</section>` (currently line 174), add:

```tsx
        <div className="mt-12">
          <h2 className="font-display text-2xl font-semibold uppercase tracking-tight">Past games</h2>
          <p className="mt-1 text-sm text-muted">Runs you&apos;ve already played.</p>

          {pastJoinedError ? (
            <p className="mt-6 border-2 border-vermilion-ink bg-vermilion-ink/10 p-6 text-vermilion-ink">
              We couldn&apos;t load your past games right now. Please try again later.
            </p>
          ) : pastJoinedGames.length === 0 ? (
            <p className="mt-6 border-2 border-ink bg-paper p-6 text-muted">
              No past games yet.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pastJoinedGames.map(({ game, status }) => (
                <div key={game.id} className="flex flex-col gap-2">
                  <span className="self-start border border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink">
                    {status === "attended"
                      ? "Played"
                      : status === "missed"
                        ? "Missed"
                        : "Not marked"}
                  </span>
                  <GameCard game={game} />
                </div>
              ))}
            </div>
          )}
        </div>
```

- [ ] **Step 6: Verify it compiles and builds**

Run: `npm run lint && npm run build`
Expected: no errors.

- [ ] **Step 7: Manually verify**

Run `npm run dev`, log in, open `/dashboard`. Expected:
- Show-up rate line under the welcome copy: `Show-up rate: New` for a fresh account, or e.g. `Show-up rate: 82% · 9/11 marked games`.
- `Past games` section: `No past games yet.` when none, else up to 6 most-recent cards each with a `Played` / `Missed` / `Not marked` badge.

Then stop the dev server (kill the port).

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "add dashboard past games and show-up rate"
```

---

## Manual Test Cases (post-implementation)

1. New player roster badge → `New`.
2. Player with 1 attended + 1 missed → roster badge `50% · 2 marked games`.
3. Roster response contains no user IDs / game IDs / dates / raw status rows.
4. Logged-out and logged-in non-member still cannot load the roster.
5. Host marks you `attended` after a game starts → dashboard Past games shows it with `Played`.
6. `missed` → `Missed`; unmarked past `joined` → `Not marked`.
7. 7+ past joined games → only 6 most recent (by `starts_at` desc) shown.
8. 9 attended / 2 missed all-time → `Show-up rate: 82% · 9/11 marked games`.
9. No decided games → `Show-up rate: New`.
10. 8 attended past games (6 shown as cards) → show-up rate still reflects all-time `8/8`, proving it is not from the 6 cards.
