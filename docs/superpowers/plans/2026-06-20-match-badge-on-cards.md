# Match Badge on Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a compact skill-fit badge on discovery game cards, reusing the existing `getMatch()`.

**Architecture:** A pure `getMatchBadge()` helper in `lib/match.ts` maps a `MatchResult` to short badge text + tone (or `null` to hide). A small server component `MatchBadge` renders the pill. `GameCard` gains an optional `match` prop; the browse and dashboard-upcoming pages compute the match and pass it, all other card surfaces omit it.

**Tech Stack:** Next.js 16 (App Router, server components), React 19, TypeScript, Tailwind CSS 4. Vitest (added in Task 1) for the one pure-function test.

## Global Constraints

- Reuse the existing match palette — `success` → `border-success text-success`, `warning` → `border-vermilion-ink text-vermilion-ink`, `muted` → `border-ink text-muted`. No new colors.
- Badge text: `Good Fit` / `Too Competitive` / `Too Casual`. `Missing Profile Info` renders nothing.
- Badge shows ONLY on `/games` cards and `/dashboard` "Upcoming games" cards. Never on Joined / Hosted / Past cards.
- No new runtime dependencies, no ranking/sorting, no change to `getMatch()` itself.
- Commit messages: lowercase imperative, `<action> <change>` (project convention).

---

### Task 1: `getMatchBadge` helper + vitest

**Files:**
- Modify: `lib/match.ts` (append helper + types)
- Test: `lib/match.test.ts` (create)
- Modify: `package.json` (add `test` script + `vitest` devDep)

**Interfaces:**
- Consumes: existing `MatchResult` / `MatchLabel` from `lib/match.ts`.
- Produces:
  - `type MatchTone = "success" | "warning" | "muted"`
  - `interface MatchBadge { text: string; tone: MatchTone }`
  - `function getMatchBadge(match: MatchResult): MatchBadge | null`

- [ ] **Step 1: Install vitest and add test script**

Run:
```bash
npm install -D vitest
```

Then add to `package.json` `scripts` (after the `lint` line):
```json
    "test": "vitest run"
```

- [ ] **Step 2: Write the failing test**

Create `lib/match.test.ts`. Uses a relative import so no path-alias config is needed; vitest defaults to the node environment, which is correct for this pure function.
```ts
import { describe, it, expect } from "vitest";
import { getMatchBadge } from "./match";

describe("getMatchBadge", () => {
  it("maps Good Fit to a success badge", () => {
    expect(getMatchBadge({ label: "Good Fit", reason: "" })).toEqual({
      text: "Good Fit",
      tone: "success",
    });
  });

  it("maps Might Be Too Competitive to a warning badge", () => {
    expect(
      getMatchBadge({ label: "Might Be Too Competitive", reason: "" }),
    ).toEqual({ text: "Too Competitive", tone: "warning" });
  });

  it("maps Might Be Too Casual to a muted badge", () => {
    expect(
      getMatchBadge({ label: "Might Be Too Casual", reason: "" }),
    ).toEqual({ text: "Too Casual", tone: "muted" });
  });

  it("returns null for Missing Profile Info", () => {
    expect(
      getMatchBadge({ label: "Missing Profile Info", reason: "" }),
    ).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `getMatchBadge` is not exported from `./match`.

- [ ] **Step 4: Implement the helper**

Append to `lib/match.ts` (after `getMatch`):
```ts
export type MatchTone = "success" | "warning" | "muted";

export interface MatchBadge {
  text: string;
  tone: MatchTone;
}

export function getMatchBadge(match: MatchResult): MatchBadge | null {
  switch (match.label) {
    case "Good Fit":
      return { text: "Good Fit", tone: "success" };
    case "Might Be Too Competitive":
      return { text: "Too Competitive", tone: "warning" };
    case "Might Be Too Casual":
      return { text: "Too Casual", tone: "muted" };
    case "Missing Profile Info":
      return null;
  }
}
```
The exhaustive `switch` over the `MatchLabel` union means TypeScript flags any future label that is not handled.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/match.ts lib/match.test.ts package.json package-lock.json
git commit -m "add match badge helper"
```

---

### Task 2: `MatchBadge` component

**Files:**
- Create: `components/match-badge.tsx`

**Interfaces:**
- Consumes: `getMatchBadge`, `MatchResult`, `MatchTone` from `lib/match.ts` (Task 1).
- Produces: default export `MatchBadge` — props `{ match: MatchResult }`. Renders `null` when `getMatchBadge` returns `null`.

- [ ] **Step 1: Create the component**

Create `components/match-badge.tsx`:
```tsx
import { getMatchBadge, type MatchResult, type MatchTone } from "@/lib/match";

const toneClass: Record<MatchTone, string> = {
  success: "border-success text-success",
  warning: "border-vermilion-ink text-vermilion-ink",
  muted: "border-ink text-muted",
};

export default function MatchBadge({ match }: { match: MatchResult }) {
  const badge = getMatchBadge(match);
  if (!badge) {
    return null;
  }

  return (
    <span
      className={`shrink-0 border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${toneClass[badge.tone]}`}
    >
      {badge.text}
    </span>
  );
}
```
The class string mirrors `SpotsBadge` (`shrink-0 border px-2 py-0.5 text-xs font-bold uppercase tracking-wide`) so the two pills sit consistently.

- [ ] **Step 2: Verify it type-checks and lints**

Run: `npm run lint`
Expected: PASS, no errors for `components/match-badge.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/match-badge.tsx
git commit -m "add match badge component"
```

---

### Task 3: `GameCard` optional match prop

**Files:**
- Modify: `components/game-card.tsx`

**Interfaces:**
- Consumes: `MatchBadge` (Task 2), `MatchResult` from `lib/match.ts`.
- Produces: `GameCard` props become `{ game: PickupGame; match?: MatchResult }`. When `match` is omitted the card is visually unchanged.

- [ ] **Step 1: Add imports**

In `components/game-card.tsx`, below the existing `import type { PickupGame }` line:
```tsx
import type { MatchResult } from "@/lib/match";
import MatchBadge from "@/components/match-badge";
```

- [ ] **Step 2: Widen the props**

Change the signature:
```tsx
export default function GameCard({
  game,
  match,
}: {
  game: PickupGame;
  match?: MatchResult;
}) {
```

- [ ] **Step 3: Render the badge in the top row**

Replace the top-row block:
```tsx
      <div className="flex items-center justify-between gap-3">
        <span className="bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-paper">
          {game.gameType}
        </span>
        <SpotsBadge spotsLeft={spotsLeft} />
      </div>
```
with:
```tsx
      <div className="flex items-center justify-between gap-3">
        <span className="bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-paper">
          {game.gameType}
        </span>
        <div className="flex items-center gap-2">
          {match && <MatchBadge match={match} />}
          <SpotsBadge spotsLeft={spotsLeft} />
        </div>
      </div>
```
`MatchBadge` returns `null` for the missing-profile case, so the right group collapses to just the spots badge when there is no fit to show.

- [ ] **Step 4: Verify it type-checks and lints**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/game-card.tsx
git commit -m "add optional match badge to game card"
```

---

### Task 4: Wire `/games` browse page

**Files:**
- Modify: `app/games/page.tsx`

**Interfaces:**
- Consumes: `getMatch` from `lib/match.ts`, `getCurrentProfile` from `lib/profiles.ts`, `GameCard` `match` prop (Task 3).

- [ ] **Step 1: Add imports**

In `app/games/page.tsx`, add below the existing imports:
```tsx
import { getMatch } from "@/lib/match";
import { getCurrentProfile } from "@/lib/profiles";
```

- [ ] **Step 2: Fetch profile in parallel with games**

Replace:
```tsx
  const { games, error } = await fetchPublicGames();
```
with:
```tsx
  const [{ games, error }, profile] = await Promise.all([
    fetchPublicGames(),
    getCurrentProfile(),
  ]);
```

- [ ] **Step 3: Pass match to each card**

Replace:
```tsx
              <GameCard key={game.id} game={game} />
```
with:
```tsx
              <GameCard
                key={game.id}
                game={game}
                match={getMatch(profile, game)}
              />
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS — `/games` compiles, no type errors.

- [ ] **Step 5: Commit**

```bash
git add app/games/page.tsx
git commit -m "show match badge on browse games"
```

---

### Task 5: Wire `/dashboard` upcoming cards

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getMatch` from `lib/match.ts`, the already-fetched `profile`, `GameCard` `match` prop (Task 3).

- [ ] **Step 1: Add the import**

In `app/dashboard/page.tsx`, add below the existing imports:
```tsx
import { getMatch } from "@/lib/match";
```

- [ ] **Step 2: Pass match to the Upcoming-games cards only**

In the "Upcoming games" section, replace:
```tsx
              {recommendedGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
```
with:
```tsx
              {recommendedGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  match={getMatch(profile, game)}
                />
              ))}
```
Leave the Joined, Hosted, and Past-hosted `.map(...)` blocks unchanged — those cards must not show a badge.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS — `/dashboard` compiles, no type errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, then:
- Logged out, visit `/games` → no badges on any card.
- Logged in with a skill level set, visit `/games` → each card shows `Good Fit` / `Too Competitive` / `Too Casual` per the game's skill range.
- Visit `/dashboard` → Upcoming cards show badges; Joined / Hosted / Past cards show none.

Stop the dev server (kill the port) when done.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "show match badge on dashboard upcoming games"
```

---

## Self-Review

**Spec coverage:**
- Badge on `/games` + dashboard upcoming → Tasks 4, 5. ✓
- Not on joined/hosted/past → Task 5 Step 2 (explicit). ✓
- Optional prop mechanism → Task 3. ✓
- Short-text + hide rule → Task 1 `getMatchBadge`. ✓
- Tone palette reuse → Task 2 `toneClass`, matches Global Constraints. ✓
- Profile parallel-fetch on browse → Task 4 Step 2. ✓
- Unit test for the pure logic → Task 1. ✓

**Placeholder scan:** none — every code/test step is complete.

**Type consistency:** `getMatchBadge(match: MatchResult): MatchBadge | null`, `MatchTone`, and the `{ game, match? }` `GameCard` props are used identically across Tasks 1–5.
