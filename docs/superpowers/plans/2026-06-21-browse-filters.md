# Browse Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-browser filtering of the `/games` grid by game type, competitiveness, skill fit, and area.

**Architecture:** The `/games` server component already fetches games + the viewer's profile. It now bundles each game with its precomputed `getMatch` result and hands the array to a new client component, which holds ephemeral filter state and renders an editorial chip bar over an in-memory filtered grid. All filter logic lives in a pure, unit-tested module.

**Tech Stack:** Next.js 16.2.7 (App Router, RSC), React 19, TypeScript, Tailwind v4, vitest.

## Global Constraints

- **No new dependencies.** Use only what `package.json` already has.
- **No DB changes.** Zero new queries; filtering is in-memory over already-fetched games.
- **Modified Next.js (16.2.7).** Per `AGENTS.md`, APIs may differ from training data — consult `node_modules/next/dist/docs/` before writing framework code and heed deprecation notices. Relevant here: `"use client"` boundary and passing plain serializable objects (`PickupGame`, `MatchResult`) from a server to a client component.
- **Editorial styling.** Reuse existing tokens from `lib/ui.ts` (`field`, `label`) and match the card chip aesthetic: uppercase, bordered; active chip fills `bg-ink text-paper`.
- **Test command:** `npm test` (vitest run). Type-check: `npx tsc --noEmit`. Lint: `npm run lint`.

---

## File Structure

- `lib/game-filters.ts` (new) — pure types + filter predicate. One responsibility: decide which games pass a `FilterState`.
- `lib/game-filters.test.ts` (new) — vitest unit tests for the predicate.
- `components/games-browser.tsx` (new) — `"use client"` filter UI + filtered grid. One responsibility: render filter controls and the resulting grid.
- `app/games/page.tsx` (modify) — build `items` + `canMatch`, render `<GamesBrowser>`.

> **Deviation from spec:** the spec listed a `hasActiveFilters` helper. It is omitted: `GamesBrowser` only mounts when `games.length > 0` (the server component keeps the separate zero-games-fetched empty state), so an empty *filtered* result always implies active filters and the "Clear filters" action is always valid. No consumer needs `hasActiveFilters`.

---

## Task 1: Pure filter logic

**Files:**
- Create: `lib/game-filters.ts`
- Test: `lib/game-filters.test.ts`

**Interfaces:**
- Consumes: `PickupGame`, `GameType`, `Competitiveness` from `@/lib/types`; `MatchResult` from `@/lib/match`.
- Produces:
  - `interface GameItem { game: PickupGame; match: MatchResult }`
  - `interface FilterState { types: GameType[]; levels: Competitiveness[]; goodFitOnly: boolean; area: string }`
  - `const emptyFilters: FilterState`
  - `function filterGames(items: GameItem[], filters: FilterState): GameItem[]`

- [ ] **Step 1: Write the failing tests**

Create `lib/game-filters.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { filterGames, emptyFilters, type GameItem } from "./game-filters";
import type { Competitiveness, GameType, PickupGame } from "@/lib/types";
import type { MatchLabel } from "@/lib/match";

function makeItem(overrides: {
  id?: string;
  gameType?: GameType;
  competitiveness?: Competitiveness;
  area?: string;
  locationName?: string;
  label?: MatchLabel;
}): GameItem {
  const game: PickupGame = {
    id: overrides.id ?? "1",
    creatorId: "c",
    title: "Run",
    locationName: overrides.locationName ?? "Lincoln Park",
    area: overrides.area ?? "North Side",
    startsAt: "2026-06-21T09:00:00Z",
    dateTimeDisplay: "Sat, Jun 21 · 9:00 AM",
    gameType: overrides.gameType ?? "5v5",
    currentPlayers: 0,
    maxPlayers: 10,
    competitiveness: overrides.competitiveness ?? "Casual",
    skillRange: { min: "Beginner", max: "Elite" },
    notes: "",
  };
  return { game, match: { label: overrides.label ?? "Good Fit", reason: "" } };
}

describe("filterGames", () => {
  const items = [
    makeItem({ id: "a", gameType: "3v3", competitiveness: "Casual", area: "North Side", label: "Good Fit" }),
    makeItem({ id: "b", gameType: "5v5", competitiveness: "Competitive", area: "South Loop", label: "Might Be Too Competitive" }),
    makeItem({ id: "c", gameType: "5v5", competitiveness: "Highly Competitive", locationName: "Westside Gym", area: "West Town", label: "Good Fit" }),
  ];

  it("returns all items when filters are empty", () => {
    expect(filterGames(items, emptyFilters)).toHaveLength(3);
  });

  it("keeps only the selected game type", () => {
    const result = filterGames(items, { ...emptyFilters, types: ["3v3"] });
    expect(result.map((i) => i.game.id)).toEqual(["a"]);
  });

  it("ORs multiple selected types together", () => {
    const result = filterGames(items, { ...emptyFilters, types: ["3v3", "5v5"] });
    expect(result.map((i) => i.game.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps only the selected competitiveness", () => {
    const result = filterGames(items, { ...emptyFilters, levels: ["Competitive"] });
    expect(result.map((i) => i.game.id)).toEqual(["b"]);
  });

  it("keeps only Good Fit matches when goodFitOnly is set", () => {
    const result = filterGames(items, { ...emptyFilters, goodFitOnly: true });
    expect(result.map((i) => i.game.id)).toEqual(["a", "c"]);
  });

  it("matches area case-insensitively against area and locationName", () => {
    expect(filterGames(items, { ...emptyFilters, area: "south" }).map((i) => i.game.id)).toEqual(["b"]);
    expect(filterGames(items, { ...emptyFilters, area: "WESTSIDE" }).map((i) => i.game.id)).toEqual(["c"]);
  });

  it("ignores surrounding whitespace in the area query", () => {
    expect(filterGames(items, { ...emptyFilters, area: "  north  " }).map((i) => i.game.id)).toEqual(["a"]);
  });

  it("combines dimensions with AND", () => {
    const result = filterGames(items, {
      ...emptyFilters,
      types: ["5v5"],
      goodFitOnly: true,
    });
    expect(result.map((i) => i.game.id)).toEqual(["c"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- game-filters`
Expected: FAIL — cannot resolve `./game-filters`.

- [ ] **Step 3: Write the implementation**

Create `lib/game-filters.ts`:

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

export const emptyFilters: FilterState = {
  types: [],
  levels: [],
  goodFitOnly: false,
  area: "",
};

export function filterGames(
  items: GameItem[],
  filters: FilterState,
): GameItem[] {
  const area = filters.area.trim().toLowerCase();

  return items.filter(({ game, match }) => {
    if (filters.types.length > 0 && !filters.types.includes(game.gameType)) {
      return false;
    }
    if (
      filters.levels.length > 0 &&
      !filters.levels.includes(game.competitiveness)
    ) {
      return false;
    }
    if (filters.goodFitOnly && match.label !== "Good Fit") {
      return false;
    }
    if (
      area &&
      !`${game.locationName} ${game.area}`.toLowerCase().includes(area)
    ) {
      return false;
    }
    return true;
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- game-filters`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/game-filters.ts lib/game-filters.test.ts
git commit -m "add game filter logic"
```

---

## Task 2: Filter UI + page wiring

**Files:**
- Create: `components/games-browser.tsx`
- Modify: `app/games/page.tsx`

**Interfaces:**
- Consumes: `GameItem`, `FilterState`, `emptyFilters`, `filterGames` from `@/lib/game-filters`; `GameCard` from `@/components/game-card`; `field`, `label` from `@/lib/ui`; `GameType`, `Competitiveness` from `@/lib/types`.
- Produces: default-exported `GamesBrowser` component with props `{ items: GameItem[]; canMatch: boolean }`.

> No automated test: the repo has no component-test harness, and adding one (React Testing Library) violates the no-new-dependency constraint. Filter behavior is already covered by Task 1's unit tests; this task is verified by type-check, lint, and a manual browse check.

- [ ] **Step 1: Write the client component**

Create `components/games-browser.tsx`:

```tsx
"use client";

import { useState } from "react";

import GameCard from "@/components/game-card";
import {
  emptyFilters,
  filterGames,
  type FilterState,
  type GameItem,
} from "@/lib/game-filters";
import type { Competitiveness, GameType } from "@/lib/types";
import { field, label } from "@/lib/ui";

const GAME_TYPES: GameType[] = ["3v3", "4v4", "5v5", "Open Run"];
const LEVELS: Competitiveness[] = [
  "Casual",
  "Competitive",
  "Highly Competitive",
];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition ${
        active
          ? "bg-ink text-paper"
          : "border-2 border-ink text-ink hover:bg-ink hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

export default function GamesBrowser({
  items,
  canMatch,
}: {
  items: GameItem[];
  canMatch: boolean;
}) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const visible = filterGames(items, filters);

  function toggleType(type: GameType) {
    setFilters((f) => ({
      ...f,
      types: f.types.includes(type)
        ? f.types.filter((t) => t !== type)
        : [...f.types, type],
    }));
  }

  function toggleLevel(level: Competitiveness) {
    setFilters((f) => ({
      ...f,
      levels: f.levels.includes(level)
        ? f.levels.filter((l) => l !== level)
        : [...f.levels, level],
    }));
  }

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 border-2 border-ink bg-paper p-5">
        <div>
          <span className={label}>Type</span>
          <div className="flex flex-wrap gap-2">
            {GAME_TYPES.map((type) => (
              <FilterChip
                key={type}
                active={filters.types.includes(type)}
                onClick={() => toggleType(type)}
              >
                {type}
              </FilterChip>
            ))}
          </div>
        </div>

        <div>
          <span className={label}>Level</span>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((level) => (
              <FilterChip
                key={level}
                active={filters.levels.includes(level)}
                onClick={() => toggleLevel(level)}
              >
                {level}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {canMatch && (
            <FilterChip
              active={filters.goodFitOnly}
              onClick={() =>
                setFilters((f) => ({ ...f, goodFitOnly: !f.goodFitOnly }))
              }
            >
              Good Fit only
            </FilterChip>
          )}
          <input
            type="text"
            value={filters.area}
            onChange={(e) =>
              setFilters((f) => ({ ...f, area: e.target.value }))
            }
            placeholder="Search area or location"
            aria-label="Search area or location"
            className={`${field} sm:max-w-xs`}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-10 border-2 border-ink bg-paper p-6">
          <p className="text-muted">No games match your filters.</p>
          <button
            type="button"
            onClick={() => setFilters(emptyFilters)}
            className="mt-4 text-sm font-bold uppercase tracking-wide text-vermilion-ink underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ game, match }) => (
            <GameCard key={game.id} game={game} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire the page to the component**

Replace the contents of `app/games/page.tsx` with:

```tsx
import GamesBrowser from "@/components/games-browser";
import SiteHeader from "@/components/site-header";
import { fetchPublicGames } from "@/lib/games";
import { getMatch } from "@/lib/match";
import { getCurrentProfile } from "@/lib/profiles";

export default async function GamesPage() {
  const [{ games, error }, profile] = await Promise.all([
    fetchPublicGames(),
    getCurrentProfile(),
  ]);

  const items = games.map((game) => ({
    game,
    match: getMatch(profile, game),
  }));
  const canMatch = profile?.skillLevel != null;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-vermilion-ink">
            Browse games
          </p>

          <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-6xl">
            Public pickup runs
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            Find a run that fits your skill level, competitiveness, and schedule.
          </p>
        </div>

        {error ? (
          <p className="mt-10 border-2 border-vermilion-ink bg-vermilion-ink/10 p-6 text-vermilion-ink">
            We couldn&apos;t load games right now. Please try again later.
          </p>
        ) : games.length === 0 ? (
          <p className="mt-10 border-2 border-ink bg-paper p-6 text-muted">
            No public games yet. Be the first to post a run.
          </p>
        ) : (
          <GamesBrowser items={items} canMatch={canMatch} />
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/games`.
- Logged out: no "Good Fit only" chip; Type / Level / area filters narrow the grid; chips toggle active styling.
- Logged in with a skill level: "Good Fit only" appears and limits to Good Fit games.
- Apply filters that match nothing → "No games match your filters." + working Clear filters button.
- Clear filters restores the full grid.

Kill the dev server (by port) when done.

- [ ] **Step 5: Commit**

```bash
git add components/games-browser.tsx app/games/page.tsx
git commit -m "add filters to browse games"
```

---

## Self-Review

- **Spec coverage:** Four filter dimensions (Task 1 logic + Task 2 UI); AND-across / OR-within semantics, area trim + case-insensitive, Good-Fit-only (Task 1 tests); logged-out hides Good Fit chip via `canMatch` (Task 2); editorial chip layout + area `field` (Task 2); empty-state note + Clear filters (Task 2); zero-games-fetched state preserved in server component (Task 2 page). `hasActiveFilters` intentionally dropped — documented in File Structure.
- **Placeholders:** none — all steps carry full code/commands.
- **Type consistency:** `GameItem`, `FilterState`, `emptyFilters`, `filterGames` names + signatures match between Task 1 definitions and Task 2 consumption; `canMatch` prop name consistent across component and page.
