# Fix game time timezone handling

**Date:** 2026-06-25
**Status:** Approved design

## Problem

A game's start time is written and read in two different timezones, so the time
a user sees is wrong wherever the server's timezone differs from the creator's.

`starts_at` is stored correctly as `timestamptz` (an absolute UTC instant), but
the code around it is asymmetric:

| Path | Where it runs | Timezone used |
|------|---------------|---------------|
| Write — `fieldsToRow` in `lib/game-fields.ts`, called from `components/game-form.tsx` (`"use client"`) | browser | creator's browser TZ |
| Display — `formatStartsAt` in `lib/games.ts`, called from server-side fetch functions | **server** | server TZ (UTC in production) |
| Edit prefill — `app/games/[id]/edit/page.tsx` (server component) splits `starts_at` with `getFullYear()`/`getHours()` | **server** | server TZ |

The write path uses the creator's browser timezone. That is not inherently
"correct" — it is acceptable for the MVP only because the creator's browser
timezone is currently used as a stand-in for the court's timezone. The display
and edit paths, by contrast, run on the server in its own timezone, so they
disagree with what the creator entered.

A game created at 9:00 AM in an Eastern-time browser stores `13:00Z`, then the
server renders it with `toLocaleString` in UTC and shows "1:00 PM". The edit form
prefills 13:00. Local development hides the bug because the dev machine's TZ
equals the browser's TZ; it surfaces in production where the server runs in UTC.

## Goal

A game's start time means the **wall-clock time at the court** — the same time
for every viewer, independent of the server's or the viewer's timezone. Achieve
this by recording each game's IANA timezone and pinning all formatting to it.

## Decisions

- **Product meaning:** game time = local time at the court/location, shown
  identically to all viewers.
- **Timezone source:**
  - On **create**, silently capture the creator's browser timezone via
    `Intl.DateTimeFormat().resolvedOptions().timeZone`. No visible picker.
  - On **edit**, preserve the game's existing `timezone`. The editor's current
    browser timezone is **not** recaptured, so a host editing while traveling
    cannot silently shift the game's wall-clock time.
  - HoopFind is currently local/regional (framed around W&M / Virginia pickup
    runs), so the creator's browser zone is an acceptable stand-in for the
    court's zone.
- **Default timezone:** `America/New_York` — Eastern is the safer MVP default
  given the current Virginia framing. Used both as the DB column default and as
  the in-code fallback when the browser zone cannot be resolved.
- **Storage:** add a `timezone` column (IANA name, e.g. `America/New_York`).
  `starts_at` keeps storing the absolute UTC instant, unchanged in mechanism.
- **Formatting:** every render of `starts_at` passes `{ timeZone }` to `Intl`,
  making output deterministic regardless of where the code runs (server or any
  browser).
- **Tooling:** native `Intl` only. No date library is added.
- **Existing data:** backfill the new column via the column default
  (`America/New_York`). Pre-existing rows predate any recorded zone, so this is a
  best-guess backfill, acceptable for the current dev/regional stage.

## Scope

### In scope

- New migration adding `games.timezone` with a kept default.
- A `getBrowserTimeZone()` helper with a safe fallback.
- `GameFields` carrying a `timezone` field; create initializes it empty (→
  browser), edit initializes it from `game.timezone`.
- Capturing/preserving the timezone in `fieldsToRow`.
- Pinning `formatStartsAt` to the game's timezone.
- Rebuilding the edit-page prefill to read the wall-clock in the game's timezone,
  with correct midnight handling.
- Unit tests for write, edit-preserve, display, midnight, and server-TZ
  independence.

### Out of scope

- A visible timezone picker or per-game override.
- Deriving the timezone from the court's actual location (geocoding the `area`
  free-text field).
- Backfilling existing rows with anything smarter than one default zone.
- `isGameStarted`, `canceled_at`, `created_at` — these compare or display
  absolute instants and are timezone-agnostic; left untouched.

### Future work

If HoopFind expands across timezones, replace or supplement silent browser
capture with a court/location-derived timezone (geocode the location) or an
explicit override picker (native `Intl.supportedValuesOf('timeZone')` list, no
dependency). The `timezone` column added here is the seam for that change.

## Changes

### 1. `supabase/migrations/010_add_game_timezone.sql` — schema (new)

Add the column with a kept default so existing rows backfill **and** so that, if
the migration is applied before the app code deploys, older insert code that does
not yet send `timezone` still succeeds instead of failing the `not null`
constraint:

```sql
alter table public.games
  add column timezone text not null default 'America/New_York';
```

The default is intentionally **not** dropped.

### 2. `lib/game-fields.ts` — write path and helper

Add a safe browser-timezone resolver. It falls back to `America/New_York` when
`Intl` returns nothing or an unusable value (validated by attempting to format
with the zone, which throws on an invalid IANA name):

```ts
export function getBrowserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      // Throws RangeError on an invalid IANA name.
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return tz;
    }
  } catch {
    // fall through
  }
  return "America/New_York";
}
```

Add `timezone` to the `GameFields` type and set it empty in `emptyGame`:

```ts
export type GameFields = {
  // ...existing fields...
  timezone: string;
};

export const emptyGame: GameFields = {
  // ...existing fields...
  timezone: "",
};
```

`fieldsToRow` uses the field's timezone when present and only falls back to the
browser zone for new games (where it is empty). Because the edit form always
carries the game's stored `timezone`, edit never recaptures the editor's zone:

```ts
// in fieldsToRow's row object
timezone: fields.timezone.trim() || getBrowserTimeZone(),
```

`getBrowserTimeZone` only resolves to a real zone in the browser; `fieldsToRow`
is only ever called from the client `GameForm`, so this is safe.

### 3. `lib/games.ts` — display path

`GameRow` gains `timezone: string`; `GAME_COLUMNS` adds `timezone`.
`formatStartsAt` takes the zone and pins both parts to it:

```ts
function formatStartsAt(startsAt: string, timeZone: string): string {
  const date = new Date(startsAt);
  const datePart = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone,
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  return `${datePart} · ${timePart}`;
}
```

`mapGameRow` passes `row.timezone` to `formatStartsAt`. Both consumers of
`dateTimeDisplay` (`components/game-card.tsx`, `app/games/[id]/page.tsx`) are
unchanged — they render the now-correct string.

### 4. `app/games/[id]/edit/page.tsx` — edit prefill

Replace the server-TZ `getFullYear()`/`getHours()` extraction with a helper that
reads the wall-clock parts in the game's stored zone, so the form shows the time
the creator originally entered. Use `hourCycle: "h23"` so midnight is `00`, never
`24`, and normalize defensively:

```ts
function partsInZone(startsAt: string, timeZone: string) {
  // en-CA gives YYYY-MM-DD; hourCycle "h23" gives 24h HH:mm with midnight as
  // 00 (not 24) — both match the <input type="date"> / <input type="time">
  // formats directly.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(startsAt));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour; // belt-and-suspenders
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${hour}:${p.minute}`,
  };
}
```

Build `initial` from its result, and carry the game's timezone into the form so a
re-save preserves it:

```ts
const { date, time } = partsInZone(row.starts_at, row.timezone);
const initial: GameFields = {
  // ...existing fields...
  date,
  time,
  timezone: row.timezone,
};
```

On save, `GameForm` re-runs `fieldsToRow`, which sees the non-empty
`fields.timezone` and keeps it — the game's wall-clock and zone both round-trip
unchanged regardless of where the host is editing from.

## Testing

Unit tests in `lib/game-fields.test.ts` (vitest):

- **Create includes a timezone:** `fieldsToRow` on a create-style fixture (empty
  `timezone`) returns a non-empty `timezone` string.
- **Edit preserves an existing timezone:** `fieldsToRow` on a fixture with
  `timezone: "America/Los_Angeles"` returns exactly that, regardless of the
  machine's browser zone.
- **Display in a fixed zone:** formatting `2026-06-25T13:00:00Z` in
  `America/New_York` yields a string containing "9:00" (proves the zone, not the
  runtime, decides the wall-clock).
- **Midnight prefill:** `partsInZone` (export it or test via a thin wrapper) for
  an instant that is local midnight in the target zone returns `time` `"00:00"`,
  never `"24:00"`.
- **Server-TZ independence:** the display and prefill assertions hold with the
  process timezone forced to UTC (e.g. running vitest with `TZ=UTC`), confirming
  the server's zone does not affect the displayed time.

If `formatStartsAt` is not exported, export it or add a thin tested wrapper.

Manual checks (after applying migration 010):

- Create a game at a chosen time; the card and detail page show that same time.
- Open the edit form; the prefilled date/time match what was entered, including a
  game set to midnight.
- Confirm correctness against a server/browser TZ mismatch (set `TZ=UTC` for the
  dev server, or deploy) — the displayed time no longer drifts.

## Rollout note

Migration 010 is safe to apply before or after the code deploys: the kept column
default supplies `America/New_York` for any insert that does not yet send
`timezone`, so neither ordering breaks writes.
