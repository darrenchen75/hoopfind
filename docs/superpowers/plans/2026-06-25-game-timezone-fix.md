# Game Timezone Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every game's start time mean the wall-clock time at the court, shown identically to all viewers regardless of server or browser timezone.

**Architecture:** Store an IANA `timezone` per game alongside the existing `starts_at timestamptz`. All wall-clock ↔ UTC conversion and all display formatting are pinned to that zone via native `Intl`, in a new pure `lib/datetime.ts`. Create captures the browser zone; edit preserves the stored zone. Every zone-consuming helper normalizes its input so a bad stored value falls back to the default instead of throwing during server rendering.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres), vitest. Native `Intl` only.

## Global Constraints

- Native `Intl` only — **no date library** may be added.
- `DEFAULT_TIME_ZONE = "America/New_York"` is the single fallback everywhere.
- No visible timezone picker.
- Path alias `@/*` → repo root.
- Migration column: `timezone text not null default 'America/New_York'`; the default is **kept** (not dropped).
- Test runner: `npx vitest run <file>` (project script is `npm run test` → `vitest run`).
- Commit messages: short, lowercase, imperative (`<action> <change>`).

## File Structure

- **Create** `lib/datetime.ts` — pure timezone helpers + browser-zone resolver + display formatter. The conversion brain; everything else imports from here.
- **Create** `lib/datetime.test.ts` — unit tests for the pure helpers.
- **Create** `supabase/migrations/010_add_game_timezone.sql` — add the column.
- **Modify** `lib/game-fields.ts` — `GameFields.timezone` (optional), `emptyGame`, `validate`, `fieldsToRow`.
- **Modify** `lib/game-fields.test.ts` — write-path tests.
- **Modify** `lib/games.ts` — `GAME_COLUMNS`, `GameRow.timezone`, `mapGameRow` uses `formatGameDateTime`; delete the old local `formatStartsAt`.
- **Modify** `app/games/[id]/edit/page.tsx` — prefill via `utcIsoToWallClockParts`, carry `timezone`.

---

### Task 1: Timezone helper module

**Files:**
- Create: `lib/datetime.ts`
- Test: `lib/datetime.test.ts`

**Interfaces:**
- Consumes: nothing (native `Intl` only).
- Produces:
  - `DEFAULT_TIME_ZONE: string` (`"America/New_York"`)
  - `normalizeTimeZone(timeZone: string | null | undefined): string`
  - `getBrowserTimeZone(): string` (browser-only)
  - `wallClockToUtcIso(date: string, time: string, timeZone: string): string`
  - `utcIsoToWallClockParts(startsAt: string, timeZone: string): { date: string; time: string }`
  - `formatGameDateTime(startsAt: string, timeZone: string): string`

- [ ] **Step 1: Write the failing tests**

Create `lib/datetime.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  DEFAULT_TIME_ZONE,
  normalizeTimeZone,
  getBrowserTimeZone,
  wallClockToUtcIso,
  utcIsoToWallClockParts,
  formatGameDateTime,
} from "./datetime";

describe("normalizeTimeZone", () => {
  it("returns a valid zone unchanged", () => {
    expect(normalizeTimeZone("America/Chicago")).toBe("America/Chicago");
  });
  it("falls back to default for an invalid zone", () => {
    expect(normalizeTimeZone("Not/AZone")).toBe(DEFAULT_TIME_ZONE);
  });
  it("falls back to default for empty/null/undefined", () => {
    expect(normalizeTimeZone("")).toBe(DEFAULT_TIME_ZONE);
    expect(normalizeTimeZone("   ")).toBe(DEFAULT_TIME_ZONE);
    expect(normalizeTimeZone(null)).toBe(DEFAULT_TIME_ZONE);
    expect(normalizeTimeZone(undefined)).toBe(DEFAULT_TIME_ZONE);
  });
});

describe("getBrowserTimeZone", () => {
  it("returns a non-empty zone that normalizes to itself", () => {
    const tz = getBrowserTimeZone();
    expect(tz.length).toBeGreaterThan(0);
    expect(normalizeTimeZone(tz)).toBe(tz);
  });
});

describe("wallClockToUtcIso", () => {
  // 2026-07-01 is summer: EDT = UTC-4, PDT = UTC-7.
  it("converts an Eastern wall-clock to the correct UTC instant", () => {
    expect(wallClockToUtcIso("2026-07-01", "09:00", "America/New_York")).toBe(
      "2026-07-01T13:00:00.000Z",
    );
  });
  it("yields a different instant for a different zone", () => {
    const east = wallClockToUtcIso("2026-07-01", "09:00", "America/New_York");
    const west = wallClockToUtcIso("2026-07-01", "09:00", "America/Los_Angeles");
    expect(west).toBe("2026-07-01T16:00:00.000Z");
    expect(west).not.toBe(east);
  });
  it("falls back to the default zone for an invalid zone", () => {
    expect(wallClockToUtcIso("2026-07-01", "09:00", "Not/AZone")).toBe(
      wallClockToUtcIso("2026-07-01", "09:00", DEFAULT_TIME_ZONE),
    );
  });
});

describe("utcIsoToWallClockParts", () => {
  it("renders an instant as date/time in the given zone", () => {
    expect(
      utcIsoToWallClockParts("2026-07-01T13:00:00.000Z", "America/New_York"),
    ).toEqual({ date: "2026-07-01", time: "09:00" });
  });
  it("returns 00:00 for local midnight, never 24:00", () => {
    // 04:00Z on 2026-07-01 is 00:00 EDT.
    expect(
      utcIsoToWallClockParts("2026-07-01T04:00:00.000Z", "America/New_York").time,
    ).toBe("00:00");
  });
});

describe("round-trip", () => {
  it("parts then back yields the original instant", () => {
    const iso = "2026-07-01T13:00:00.000Z";
    const zone = "America/New_York";
    const { date, time } = utcIsoToWallClockParts(iso, zone);
    expect(wallClockToUtcIso(date, time, zone)).toBe(iso);
  });
});

describe("formatGameDateTime", () => {
  it("formats in the given zone", () => {
    expect(formatGameDateTime("2026-07-01T13:00:00.000Z", "America/New_York")).toContain("9:00");
  });
  it("does not throw on an invalid zone", () => {
    expect(() => formatGameDateTime("2026-07-01T13:00:00.000Z", "Not/AZone")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/datetime.test.ts`
Expected: FAIL — cannot resolve `./datetime` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/datetime.ts`:

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
export function utcIsoToWallClockParts(
  startsAt: string,
  timeZone: string,
): { date: string; time: string } {
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

// Human-readable "Wed, Jul 1 · 9:00 AM" pinned to the game's zone.
export function formatGameDateTime(startsAt: string, timeZone: string): string {
  const zone = normalizeTimeZone(timeZone);
  const date = new Date(startsAt);
  const datePart = date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: zone,
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: zone,
  });
  return `${datePart} · ${timePart}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/datetime.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Verify server-timezone independence**

Run (Bash tool, POSIX): `TZ=UTC npx vitest run lib/datetime.test.ts`
Expected: PASS — identical results, proving the runtime zone does not affect conversions.

- [ ] **Step 6: Commit**

```bash
git add lib/datetime.ts lib/datetime.test.ts
git commit -m "add timezone conversion helpers"
```

---

### Task 2: Database migration

**Files:**
- Create: `supabase/migrations/010_add_game_timezone.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: a `public.games.timezone` text column (not null, default `America/New_York`) that Task 3/4 read and write.

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/010_add_game_timezone.sql`:

```sql
-- Court-local timezone for each game. Kept default so inserts that predate the
-- app code change (or omit the column) still succeed instead of failing not-null.
alter table public.games
  add column timezone text not null default 'America/New_York';
```

- [ ] **Step 2: Apply the migration to the database**

Apply via the project's Supabase workflow (SQL editor or `supabase db push`).
Expected: `games` now has a `timezone` column; existing rows read `America/New_York`.

(This is a manual/infra step — there is no automated test for the SQL.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/010_add_game_timezone.sql
git commit -m "add game timezone column"
```

---

### Task 3: Write path — capture/preserve and convert in zone

**Files:**
- Modify: `lib/game-fields.ts`
- Test: `lib/game-fields.test.ts`

**Interfaces:**
- Consumes: `getBrowserTimeZone`, `normalizeTimeZone`, `wallClockToUtcIso` from `@/lib/datetime` (Task 1).
- Produces: `GameFields` gains optional `timezone?: string`; `fieldsToRow` output gains a `timezone` string and a zone-correct `starts_at`.

- [ ] **Step 1: Write the failing tests**

In `lib/game-fields.test.ts`, add inside the existing `describe("fieldsToRow", ...)` block:

```ts
  it("captures a non-empty timezone when none is provided (create)", () => {
    const row = fieldsToRow(futureValid);
    expect(typeof row.timezone).toBe("string");
    expect((row.timezone as string).length).toBeGreaterThan(0);
  });

  it("preserves a provided timezone and converts starts_at in it (edit)", () => {
    const row = fieldsToRow({ ...futureValid, timezone: "America/Los_Angeles" });
    expect(row.timezone).toBe("America/Los_Angeles");
    expect(row.starts_at).toBe(
      wallClockToUtcIso(futureValid.date, futureValid.time, "America/Los_Angeles"),
    );
  });

  it("falls back to the default for an invalid provided timezone", () => {
    const row = fieldsToRow({ ...futureValid, timezone: "Not/AZone" });
    expect(row.timezone).toBe("America/New_York");
  });
```

Add the import at the top of the test file:

```ts
import { wallClockToUtcIso } from "./datetime";
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/game-fields.test.ts`
Expected: FAIL — `row.timezone` is `undefined` (fieldsToRow does not set it yet).

- [ ] **Step 3: Update `lib/game-fields.ts`**

Add the import (top of file, after the existing exports/imports):

```ts
import { getBrowserTimeZone, normalizeTimeZone, wallClockToUtcIso } from "@/lib/datetime";
```

Add the field to the `GameFields` type (optional, so existing call sites keep compiling):

```ts
export type GameFields = {
  title: string;
  location_name: string;
  area: string;
  date: string;
  time: string;
  game_type: string;
  max_players: string;
  competitiveness: string;
  min_skill_level: string;
  max_skill_level: string;
  notes: string;
  timezone?: string;
};
```

Add it to `emptyGame`:

```ts
export const emptyGame: GameFields = {
  title: "",
  location_name: "",
  area: "",
  date: "",
  time: "",
  game_type: gameTypes[0],
  max_players: "",
  competitiveness: competitivenessLevels[0],
  min_skill_level: skillLevels[0],
  max_skill_level: skillLevels[0],
  notes: "",
  timezone: "",
};
```

Add a shared resolver (place it just above `validate`):

```ts
// A stored zone (edit) is normalized; an empty zone (create) falls back to the
// browser's zone. The resolved value is what gets stored.
function resolveTimeZone(timezone: string | undefined): string {
  const provided = (timezone ?? "").trim();
  return provided ? normalizeTimeZone(provided) : getBrowserTimeZone();
}
```

Replace the start-time block in `validate` (currently the
`const startsAt = new Date(`${fields.date}T${fields.time}`);` block) with:

```ts
  const timeZone = resolveTimeZone(fields.timezone);
  const startsAt = new Date(wallClockToUtcIso(fields.date, fields.time, timeZone));
  if (Number.isNaN(startsAt.getTime())) {
    return "The date and time combination is not valid.";
  }

  if (startsAt.getTime() <= Date.now()) {
    return "The game must start in the future.";
  }

  return null;
```

Replace `fieldsToRow` so it resolves the zone once and uses it for both fields:

```ts
export function fieldsToRow(
  fields: GameFields,
  creatorId?: string,
): Record<string, unknown> {
  const timeZone = resolveTimeZone(fields.timezone);
  const row: Record<string, unknown> = {
    title: fields.title.trim(),
    location_name: fields.location_name.trim(),
    area: fields.area.trim(),
    starts_at: wallClockToUtcIso(fields.date, fields.time, timeZone),
    timezone: timeZone,
    game_type: fields.game_type,
    max_players: Number(fields.max_players),
    competitiveness: fields.competitiveness,
    min_skill_level: fields.min_skill_level,
    max_skill_level: fields.max_skill_level,
    notes: fields.notes.trim() || null,
  };
  if (creatorId) {
    row.creator_id = creatorId;
    row.is_public = true;
  }
  return row;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/game-fields.test.ts`
Expected: PASS — including the pre-existing `validate` and `fieldsToRow` cases (the empty-fields cases still fail validation via the required-field checks that run before the conversion).

- [ ] **Step 5: Commit**

```bash
git add lib/game-fields.ts lib/game-fields.test.ts
git commit -m "convert game times using the game timezone"
```

---

### Task 4: Display path — fetch and format in zone

**Files:**
- Modify: `lib/games.ts`

**Interfaces:**
- Consumes: `formatGameDateTime` from `@/lib/datetime` (Task 1); the `timezone` column from Task 2.
- Produces: `GameRow.timezone: string`; `dateTimeDisplay` now zone-correct. No public signature change for consumers.

- [ ] **Step 1: Update `lib/games.ts`**

Add the import (with the other `@/lib` imports near the top):

```ts
import { formatGameDateTime } from "@/lib/datetime";
```

Add `timezone` to `GAME_COLUMNS`:

```ts
const GAME_COLUMNS = "id, creator_id, title, location_name, area, starts_at, game_type, max_players, competitiveness, min_skill_level, max_skill_level, notes, canceled_at, timezone";
```

Add the field to `GameRow`:

```ts
export type GameRow = {
  id: string;
  creator_id: string;
  title: string;
  location_name: string;
  area: string;
  starts_at: string;
  game_type: string;
  max_players: number;
  competitiveness: string;
  min_skill_level: string;
  max_skill_level: string;
  notes: string | null;
  canceled_at: string | null;
  timezone: string;
};
```

Delete the local `formatStartsAt` function (the `function formatStartsAt(startsAt: string): string { ... }` block) and update `mapGameRow` to use the shared formatter:

```ts
    dateTimeDisplay: formatGameDateTime(row.starts_at, row.timezone),
```

- [ ] **Step 2: Verify the build type-checks**

Run: `npm run build`
Expected: success — no references to the deleted `formatStartsAt` remain, `row.timezone` resolves.

- [ ] **Step 3: Run the full test suite (no regressions)**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/games.ts
git commit -m "format game times in the game timezone"
```

---

### Task 5: Edit prefill in zone

**Files:**
- Modify: `app/games/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `utcIsoToWallClockParts` from `@/lib/datetime` (Task 1); `row.timezone` from `fetchGameForEdit` (now present via Task 4's `GAME_COLUMNS`/`GameRow`).
- Produces: an `initial: GameFields` whose `date`/`time` are the court wall-clock and whose `timezone` is the stored zone, so a re-save round-trips the same instant.

- [ ] **Step 1: Update `app/games/[id]/edit/page.tsx`**

Add the import:

```ts
import { utcIsoToWallClockParts } from "@/lib/datetime";
```

Replace the manual extraction (the `const starts = new Date(row.starts_at);`, the
`const pad = ...` line, and the `date:`/`time:` lines in `initial`) so the prefill
reads the wall-clock in the game's zone and carries the zone forward:

```ts
  const { date, time } = utcIsoToWallClockParts(row.starts_at, row.timezone);
  const initial: GameFields = {
    title: row.title,
    location_name: row.location_name,
    area: row.area,
    date,
    time,
    game_type: row.game_type,
    max_players: String(row.max_players),
    competitiveness: row.competitiveness,
    min_skill_level: row.min_skill_level,
    max_skill_level: row.max_skill_level,
    notes: row.notes ?? "",
    timezone: row.timezone,
  };
```

- [ ] **Step 2: Verify the build type-checks**

Run: `npm run build`
Expected: success — no `pad`/`getHours` remain; `date`, `time`, `timezone` all set.

- [ ] **Step 3: Manual verification**

- Create a game at a chosen time → its card and detail page show that same time.
- Open its edit form → prefilled date/time match what was entered.
- Set a game to `00:00` → edit form shows `00:00`, never `24:00`.
- Save the edit without changing the time → the displayed time is unchanged.
- Run the dev server under UTC (`TZ=UTC npm run dev` via Bash tool) → displayed times do not drift from what was entered.

- [ ] **Step 4: Commit**

```bash
git add "app/games/[id]/edit/page.tsx"
git commit -m "prefill edit form in the game timezone"
```

---

## Notes

- `isGameStarted`, `canceled_at`, and `created_at` are intentionally untouched — they compare/display absolute instants and are timezone-agnostic.
- `getBrowserTimeZone` is only ever called from the client `GameForm` path (via `fieldsToRow`/`validate`); the pure helpers it sits beside are server-safe.
- Known limitation (accepted for MVP): the two-pass conversion resolves ordinary offset/DST differences with no one-hour drift, but a wall-clock at the exact DST transition instant resolves only approximately.
