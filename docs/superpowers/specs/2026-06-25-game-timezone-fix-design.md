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

Once each game carries its own IANA timezone (below), a second, subtler bug
appears: interpreting the form's wall-clock with `new Date(`${date}T${time}`)`
uses the *runtime* timezone, which is no longer the game's timezone. On edit in
particular — where the game's zone is preserved but the host may be in a
different browser zone — that would silently move the stored instant. The write
path must therefore convert the wall-clock using the game's IANA timezone, not
the runtime's.

## Goal

A game's start time means the **wall-clock time at the court** — the same time
for every viewer, independent of the server's or the viewer's timezone. Achieve
this by recording each game's IANA timezone and pinning every conversion (write,
display, edit prefill) to that zone via native `Intl`.

## Decisions

- **Product meaning:** game time = local time at the court/location, shown
  identically to all viewers.
- **Timezone source:**
  - On **create**, silently capture the creator's browser timezone via
    `Intl.DateTimeFormat().resolvedOptions().timeZone`. No visible picker.
  - On **edit**, preserve the game's existing `timezone`. The editor's current
    browser timezone is **not** recaptured, so a host editing while traveling
    cannot silently shift the game's wall-clock time or its stored instant.
  - HoopFind is currently local/regional (framed around W&M / Virginia pickup
    runs), so the creator's browser zone is an acceptable stand-in for the
    court's zone.
- **Conversion:** all wall-clock ↔ UTC conversion is pinned to the game's IANA
  timezone using native `Intl`, never the runtime zone. Shared helpers live in a
  new `lib/datetime.ts`.
- **Default timezone:** `America/New_York` — Eastern is the safer MVP default
  given the current Virginia framing. Used both as the DB column default and as
  the in-code fallback when the browser zone cannot be resolved.
- **Storage:** add a `timezone` column (IANA name, e.g. `America/New_York`).
  `starts_at` keeps storing the absolute UTC instant.
- **Formatting:** every render of `starts_at` passes `{ timeZone }` to `Intl`,
  making output deterministic regardless of where the code runs.
- **Tooling:** native `Intl` only. No date library is added.
- **Existing data:** backfill the new column via the column default
  (`America/New_York`). Pre-existing rows predate any recorded zone, so this is a
  best-guess backfill, acceptable for the current dev/regional stage.

## Scope

### In scope

- New migration adding `games.timezone` with a kept default.
- New `lib/datetime.ts` holding `DEFAULT_TIME_ZONE`, `normalizeTimeZone`,
  `getBrowserTimeZone`, `wallClockToUtcIso`, and `utcIsoToWallClockParts`. Every
  zone-consuming helper normalizes its input so a bad stored value cannot throw
  during server rendering.
- `GameFields` carrying a `timezone` field; create initializes it empty (→
  browser), edit initializes it from `game.timezone`.
- `fieldsToRow` resolving the timezone and converting `starts_at` in that zone;
  `validate`'s future-start check using the same conversion.
- Pinning `formatStartsAt` to the game's timezone.
- Rebuilding the edit-page prefill via `utcIsoToWallClockParts`.
- Unit tests for conversion, round-trip, midnight, display, and server-TZ
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

### 2. `lib/datetime.ts` — shared timezone helpers (new)

Native `Intl` only. Every helper that consumes a timezone runs it through
`normalizeTimeZone` first, so a bad value stored in the `games.timezone` text
column (or passed by a caller) falls back to the default instead of throwing —
critical because `formatStartsAt` and `utcIsoToWallClockParts` run during server
rendering. `wallClockToUtcIso` and `utcIsoToWallClockParts` are pure and
server-safe; `getBrowserTimeZone` is browser-only.

```ts
export const DEFAULT_TIME_ZONE = "America/New_York";

// Returns a usable IANA zone, falling back to the default for empty/invalid input.
export function normalizeTimeZone(timeZone: string | null | undefined): string {
  const candidate = timeZone?.trim();
  if (!candidate) {
    return DEFAULT_TIME_ZONE;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }); // throws on bad name
    return candidate;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

// Browser-only: the creator's resolved IANA zone, normalized with a safe fallback.
export function getBrowserTimeZone(): string {
  try {
    return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

// Reads the instant `ms` as wall-clock in `zone`, returned as a UTC epoch (ms).
function zoneWallClockAsUtc(ms: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}

// The instant whose wall clock in `timeZone` reads `date`/`time`, as a UTC ISO
// string. Offset trick: interpret the wall-clock as if UTC, measure how that
// instant reads back in the zone, and correct. A second pass fixes the case
// where the first correction crossed a DST boundary into a different offset.
export function wallClockToUtcIso(date: string, time: string, timeZone: string): string {
  const zone = normalizeTimeZone(timeZone);
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const target = Date.UTC(y, mo - 1, d, h, mi);

  let utc = target;
  for (let pass = 0; pass < 2; pass++) {
    const diff = zoneWallClockAsUtc(utc, zone) - target; // ms the zone is ahead of target
    if (diff === 0) break;
    utc -= diff;
  }
  return new Date(utc).toISOString();
}

// A UTC ISO instant rendered as <input type="date"> / <input type="time">
// values in `timeZone`. hourCycle "h23" makes midnight "00", never "24".
export function utcIsoToWallClockParts(startsAt: string, timeZone: string): { date: string; time: string } {
  const zone = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(startsAt));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour; // belt-and-suspenders
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
}
```

**Known limitation:** the two-pass correction resolves ordinary offset and
normal DST differences (no one-hour drift), but a truly ambiguous or nonexistent
wall-clock *at the transition instant itself* still resolves only approximately.
Acceptable for the MVP.

### 3. `lib/game-fields.ts` — write path

Add `timezone` to `GameFields` and set it empty in `emptyGame`:

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

Resolve the timezone once — the field's value when present (edit), otherwise the
browser zone (create) — and use it for both the future-start check and
`starts_at`. No `new Date(`${date}T${time}`)` remains in this file.

Resolve the zone the same way in both places: a stored value (edit) is run
through `normalizeTimeZone`, an empty value (create) falls back to the browser
zone. The resolved zone is what gets stored, so no invalid string is persisted.

```ts
import { getBrowserTimeZone, normalizeTimeZone, wallClockToUtcIso } from "@/lib/datetime";

// shared resolution, used by both validate() and fieldsToRow():
const timeZone = fields.timezone.trim()
  ? normalizeTimeZone(fields.timezone)
  : getBrowserTimeZone();

// in validate(), replacing the browser-local startsAt computation:
const startsAt = new Date(wallClockToUtcIso(fields.date, fields.time, timeZone));
if (Number.isNaN(startsAt.getTime())) {
  return "The date and time combination is not valid.";
}
if (startsAt.getTime() <= Date.now()) {
  return "The game must start in the future.";
}

// in fieldsToRow's row object:
timezone: timeZone,
starts_at: wallClockToUtcIso(fields.date, fields.time, timeZone),
```

(`wallClockToUtcIso` also normalizes internally, so even an unexpected zone here
cannot throw — this resolution just ensures the *stored* `timezone` is clean.)

Because the edit form always carries the game's stored `timezone`, edit reuses
that zone and never recaptures the editor's — the stored instant is preserved.

### 4. `lib/games.ts` — display path

`GameRow` gains `timezone: string`; `GAME_COLUMNS` adds `timezone`.
`formatStartsAt` normalizes the zone (a bad stored value must not throw during
server rendering) and pins both parts to it:

```ts
import { normalizeTimeZone } from "@/lib/datetime";

function formatStartsAt(startsAt: string, rawTimeZone: string): string {
  const timeZone = normalizeTimeZone(rawTimeZone);
  const date = new Date(startsAt);
  const datePart = date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone,
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone,
  });
  return `${datePart} · ${timePart}`;
}
```

`mapGameRow` passes `row.timezone` to `formatStartsAt`. Both consumers of
`dateTimeDisplay` (`components/game-card.tsx`, `app/games/[id]/page.tsx`) are
unchanged — they render the now-correct string.

### 5. `app/games/[id]/edit/page.tsx` — edit prefill

Replace the server-TZ `getFullYear()`/`getHours()` extraction with the shared
helper, and carry the game's timezone into the form so a re-save preserves both
the zone and the instant:

```ts
import { utcIsoToWallClockParts } from "@/lib/datetime";

const { date, time } = utcIsoToWallClockParts(row.starts_at, row.timezone);
const initial: GameFields = {
  // ...existing fields...
  date,
  time,
  timezone: row.timezone,
};
```

On save, `GameForm` re-runs `validate`/`fieldsToRow`, which resolve the timezone
from the non-empty `fields.timezone` and convert with `wallClockToUtcIso` in that
zone — so re-saving without touching the date/time yields the same UTC instant,
regardless of the host's browser zone.

## Testing

Unit tests (vitest). Conversion tests live in a new `lib/datetime.test.ts`;
field-level tests extend `lib/game-fields.test.ts`.

- **`wallClockToUtcIso` — Eastern:** `wallClockToUtcIso("2026-06-25", "09:00",
  "America/New_York")` equals the instant for 9 AM Eastern (`2026-06-25T13:00:00Z`
  during EDT).
- **`wallClockToUtcIso` — zone matters:** the same `"2026-06-25"`/`"09:00"` in
  `"America/Los_Angeles"` yields a different (3-hours-later) UTC instant than
  Eastern.
- **`utcIsoToWallClockParts` — fixed zone:** a known UTC instant maps to the
  expected `date`/`time` in `"America/New_York"`.
- **Midnight:** an instant that is local midnight in the target zone returns
  `time` `"00:00"`, never `"24:00"`.
- **Edit round-trip:** start from a UTC instant + `"America/New_York"`, convert
  with `utcIsoToWallClockParts`, convert back with `wallClockToUtcIso` using the
  same zone — the result equals the original instant.
- **Invalid-zone fallback:** `normalizeTimeZone("Not/AZone")` returns
  `"America/New_York"`; `normalizeTimeZone("")` / `null` / `undefined` likewise.
- **Display tolerates a bad zone:** `formatStartsAt` (or the display wrapper) with
  an invalid timezone does not throw and renders in the default zone.
- **`fieldsToRow` tolerates a bad zone:** with `timezone: "Not/AZone"`,
  `fieldsToRow` stores `"America/New_York"` and a matching instant, no throw.
- **Create includes a timezone:** `fieldsToRow` on a create-style fixture (empty
  `timezone`) returns a non-empty `timezone` string.
- **Edit preserves the timezone:** `fieldsToRow` on a fixture with
  `timezone: "America/Los_Angeles"` returns exactly that zone and the matching
  instant, independent of the machine's browser zone.
- **Display in a fixed zone:** formatting `2026-06-25T13:00:00Z` in
  `America/New_York` yields a string containing "9:00".
- **Server-TZ independence:** the conversion, round-trip, and display assertions
  hold with the process timezone forced to UTC (run vitest with `TZ=UTC`),
  confirming the runtime's zone does not affect results.

If `formatStartsAt` is not exported, export it or add a thin tested wrapper.

Manual checks (after applying migration 010):

- Create a game at a chosen time; the card and detail page show that same time.
- Open the edit form; the prefilled date/time match what was entered, including a
  game set to midnight; saving without changes leaves the time unchanged.
- Confirm correctness against a server/browser TZ mismatch (set `TZ=UTC` for the
  dev server, or deploy) — the displayed time no longer drifts.

## Rollout note

Migration 010 is safe to apply before or after the code deploys: the kept column
default supplies `America/New_York` for any insert that does not yet send
`timezone`, so neither ordering breaks writes.
