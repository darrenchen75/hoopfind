# Browse filters on /games

**Date:** 2026-06-21
**Status:** Approved design

## Problem

The landing page promises *"You set the filters"* and `/games` promises *"Find a
run that fits your skill level, competitiveness, and schedule."* Yet `/games` is
a flat grid sorted by start time with no filtering at all. As more games get
posted, players cannot narrow to the runs that fit them.

## Goal

Let players filter the public games grid in-browser by game type,
competitiveness, skill fit, and area. No new queries, no DB changes, no new
dependencies. Filtering runs in memory over the games the page already fetches.

## Scope

### In scope

- Client-side filtering of `/games` by four dimensions:
  - **Game type** — `3v3` / `4v4` / `5v5` / `Open Run` (multi-select).
  - **Competitiveness** — `Casual` / `Competitive` / `Highly Competitive`
    (multi-select).
  - **Good Fit only** — keep only games where the viewer's match is `Good Fit`.
  - **Area** — case-insensitive substring search over `area` + `locationName`.

### Out of scope (add later if wanted)

- URL/query-param persistence of filters (filters are ephemeral React state).
- Date/time window filter.
- Filters on the dashboard.
- Sorting/ranking games by fit.

## Filter semantics

- **AND across dimensions** — a game must pass every active dimension.
- **OR within a multi-select dimension** — within Type and within Level, a game
  passes if its value is in the selected set. An empty set means no constraint
  for that dimension.
- **Good Fit only** — when active, keep games where `match.label === "Good Fit"`.
- **Area** — when non-empty, keep games where the trimmed, lowercased query is a
  substring of `${locationName} ${area}` lowercased.

## Logged-out / no-profile behavior

`getMatch` returns `Missing Profile Info` when the viewer is logged out or has no
skill level. In that state the "Good Fit only" filter would match nothing, so the
chip is **hidden** when the viewer cannot be matched. This is driven by a
`canMatch` boolean (`profile?.skillLevel != null`) passed from the server page.
The other three filters work logged out.

## Layout

Filter bar sits between the page intro and the grid, matching the editorial chip
aesthetic already used on cards:

```
BROWSE GAMES
Public pickup runs
Find a run that fits your skill level, competitiveness, and schedule.

TYPE   [3V3] [4V4] [5V5] [OPEN RUN]
LEVEL  [CASUAL] [COMPETITIVE] [HIGHLY COMPETITIVE]
       [GOOD FIT ONLY]        area: [____________]

[card] [card] [card]
```

- Each chip is an uppercase bordered pill. **Active** chip fills solid
  (`bg-ink text-paper`), matching the existing game-type chip on the card.
  **Inactive** chip is `border-2 border-ink text-ink`.
- Area input reuses the shared `field` class from `lib/ui.ts`.
- A row label (`TYPE`, `LEVEL`) uses the shared `label` styling tokens.

## Empty state

When filters exclude every game, show an editorial note ("No games match your
filters.") with a **Clear filters** button that resets all filter state. The
existing "no public games yet" empty state (zero games fetched) stays as is and
is distinct from "no games match filters".

## Components & changes

### 1. `lib/game-filters.ts` — pure filter logic (new)

```ts
import type { Competitiveness, GameType, PickupGame } from "@/lib/types";
import type { MatchResult } from "@/lib/match";

export interface GameItem {
  game: PickupGame;
  match: MatchResult;
}

export interface FilterState {
  types: GameType[];
  levels: Competitiveness[];
  goodFitOnly: boolean;
  area: string;
}

export const emptyFilters: FilterState;

export function filterGames(items: GameItem[], filters: FilterState): GameItem[];

export function hasActiveFilters(filters: FilterState): boolean;
```

`filterGames` applies the semantics above. `hasActiveFilters` reports whether any
dimension is active (used to decide whether to show the empty-state clear action
vs. nothing). This is the only non-trivial new logic, so it gets unit tests.

### 2. `components/games-browser.tsx` — client filter UI (new)

- `"use client"`.
- Props: `{ items: GameItem[]; canMatch: boolean }`.
- Holds `const [filters, setFilters] = useState(emptyFilters)`.
- Computes `const visible = filterGames(items, filters)`.
- Renders the chip bar (Type row, Level row, Good Fit chip + area input), then
  the grid of `<GameCard game match />` for `visible`.
- Toggling a Type/Level chip adds/removes that value from the set.
- "Good Fit only" chip hidden when `!canMatch`.
- Empty `visible` → editorial note + Clear filters button (`setFilters(emptyFilters)`).
- A small local `FilterChip` helper component lives in this file (not a separate
  file) — it renders the active/inactive pill and takes `active`, `onClick`,
  `children`.

### 3. `app/games/page.tsx` — wire it up (edit)

- Keep the existing parallel fetch of `fetchPublicGames()` + `getCurrentProfile()`.
- Build `items = games.map((game) => ({ game, match: getMatch(profile, game) }))`.
- Compute `canMatch = profile?.skillLevel != null`.
- Replace the inline grid with `<GamesBrowser items={items} canMatch={canMatch} />`.
- Error and zero-games-fetched states stay in the server component (unchanged).

## Data / performance

- Zero new queries. `items` is built from data the page already fetches.
- `filterGames` is pure and runs over an in-memory array on each render — trivial
  for realistic grid sizes.
- `MatchResult` and `PickupGame` are plain serializable objects, safe to pass from
  the server component to the client component.

## Testing

- Unit tests for `lib/game-filters.ts` (`lib/game-filters.test.ts`, vitest):
  - Empty filters return all items.
  - Type filter keeps only matching types; multiple types OR together.
  - Level filter keeps only matching competitiveness values.
  - Good Fit only keeps only `Good Fit` matches.
  - Area search is case-insensitive and matches both `area` and `locationName`.
  - Dimensions combine with AND.
  - `hasActiveFilters` is false for `emptyFilters`, true when any dimension set.
- Manual check: logged-out browse shows no Good Fit chip and the other filters
  work; logged-in player can filter to Good Fit; clearing filters restores the
  full grid; empty result shows the note + Clear filters button.
