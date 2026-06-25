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
| Write — `fieldsToRow` in `lib/game-fields.ts`, called from `components/game-form.tsx` (`"use client"`) | browser | viewer-local (correct) |
| Display — `formatStartsAt` in `lib/games.ts`, called from server-side fetch functions | **server** | server TZ (UTC in production) |
| Edit prefill — `app/games/[id]/edit/page.tsx` (server component) splits `starts_at` with `getFullYear()`/`getHours()` | **server** | server TZ |

A game created at 9:00 AM in a Chicago browser stores `14:00Z`, then the server
renders it with `toLocaleString` in UTC and shows "2:00 PM". The edit form
prefills 14:00. Local development hides the bug because the dev machine's TZ
equals the browser's TZ; it surfaces in production where the server runs in UTC.

## Goal

A game's start time means the **wall-clock time at the court** — the same time
for every viewer, independent of the server's or the viewer's timezone. Achieve
this by recording each game's IANA timezone and pinning all formatting to it.

## Decisions

- **Product meaning:** game time = local time at the court/location, shown
  identically to all viewers.
- **Timezone source:** silent capture of the creator's browser timezone via
  `Intl.DateTimeFormat().resolvedOptions().timeZone` on create and on edit. No
  visible timezone picker. HoopFind is currently local/regional, so the
  creator's browser zone is an acceptable stand-in for the court's zone.
- **Storage:** add a `timezone` column (IANA name, e.g. `America/Chicago`).
  `starts_at` keeps storing the absolute UTC instant, unchanged in mechanism.
- **Formatting:** every render of `starts_at` passes `{ timeZone }` to `Intl`,
  making output deterministic regardless of where the code runs (server or any
  browser).
- **Tooling:** native `Intl` only. No date library is added.
- **Existing data:** backfill the new column with a single default zone
  (`America/Chicago`). Pre-existing rows predate any recorded zone, so this is a
  best-guess backfill, acceptable for the current dev/regional stage.

## Scope

### In scope

- New migration adding `games.timezone`.
- Capturing the browser timezone in `fieldsToRow` (covers create and edit, both
  go through `GameForm`).
- Pinning `formatStartsAt` to the game's timezone.
- Rebuilding the edit-page prefill to read the wall-clock in the game's timezone.
- Unit tests for the write and display changes.

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

Add the column with a default so existing rows backfill, then keep or drop the
default to taste (the write path always supplies a value going forward):

```sql
alter table public.games
  add column timezone text not null default 'America/Chicago';

alter table public.games
  alter column timezone drop default;
```

### 2. `lib/game-fields.ts` — write path

Add the column to `GameFields` and `emptyGame`, and capture the browser zone in
`fieldsToRow`. `starts_at` is unchanged: `new Date(`${date}T${time}`)` interprets
the entered wall-clock in the browser's zone, which now equals the court's zone
by definition.

```ts
// in fieldsToRow's row object
timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
```

`Intl.DateTimeFormat().resolvedOptions().timeZone` only resolves to a real zone
in the browser; `fieldsToRow` is only ever called from the client `GameForm`, so
this is safe.

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
the creator originally entered:

```ts
function partsInZone(startsAt: string, timeZone: string) {
  // en-CA gives YYYY-MM-DD; hour12:false gives 24h HH:mm — both match
  // the <input type="date"> / <input type="time"> formats directly.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(startsAt));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
```

Use its result for `initial.date` / `initial.time`.

On save, `GameForm` re-runs `fieldsToRow`, which re-captures the browser zone and
recomputes `starts_at` — symmetric with create.

**Known edge (deliberate, `ponytail:`):** if the creator edits a game while in a
*different* timezone than the one they created it in, the prefill shows the
original court time but the re-save reinterprets the unchanged wall-clock in the
new browser zone, silently shifting the game. Acceptable for the local/regional
MVP; the Future work section above is the upgrade path.

## Testing

- Unit tests in `lib/game-fields.test.ts` (vitest):
  - `fieldsToRow` includes a non-empty `timezone` string.
  - Display test: formatting a fixed instant in a fixed zone yields a stable
    wall-clock string (e.g. `2026-06-25T14:00:00Z` in `America/Chicago` →
    contains "9:00"), proving server-TZ independence. If `formatStartsAt` is not
    exported, export it or add a thin tested wrapper.
- Manual checks (after applying migration 010):
  - Create a game at a chosen time; the card and detail page show that same time.
  - Open the edit form; the prefilled date/time match what was entered.
  - Confirm correctness against a server/browser TZ mismatch (e.g. set
    `process.env.TZ=UTC` for the dev server, or deploy) — the displayed time no
    longer drifts.

## Rollout note

Migration 010 must be applied before the write path sends `timezone` (the column
is `not null`). Apply the migration, then ship the code.
