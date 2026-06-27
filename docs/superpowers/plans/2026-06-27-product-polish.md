# Product Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish HoopFind's dashboard, game detail, empty states, mobile spacing, and accessibility — presentation only, no new features.

**Architecture:** Add three small presentation helpers (`card`/`btnSecondary`/`emptyCard` class strings in `lib/ui.ts`, plus tiny `EmptyState` and `SectionHeading` components), then restructure the dashboard and game detail markup and apply touch-target / a11y fixes to existing components. All changes ride on the existing editorial tokens; no data-layer, auth, or schema changes.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4 (`@theme` tokens in `app/globals.css`, no config file), Supabase. Spec: `docs/superpowers/specs/2026-06-27-product-polish-design.md`.

## Global Constraints

Copied verbatim from the spec — every task is bound by these:

- **No** database schema / Supabase migration changes.
- **No** changes to authentication, RLS, timezone logic, attendance logic, reliability / show-up-rate calculations, or game-matching (`getMatch`) logic.
- **No** changes to Supabase queries or data-fetching logic. Reuse the data already loaded in each page's existing `Promise.all`.
- `lib/ui.ts` changes ARE allowed (presentation-helper layer). Other `lib/` data-layer files change **only** if TypeScript forces a render-only tweak.
- **No** new npm / UI dependency. Reuse existing `@theme` tokens (`paper`, `ink`, `vermilion`, `vermilion-ink`, `muted`, `line`, `success`) and `lib/ui.ts`.
- New components (`EmptyState`, `SectionHeading`) stay **tiny** — a few props, no internal state, no variants system, no generic component library. If a wrapper makes a call site harder to read than inline markup, prefer inline markup.
- Touch targets for real buttons/inputs: **≥44px** (`min-h-11`).
- No automated test suite exists. Per-task gate is `npm run lint` + `npm run build` clean, then the manual check named in the task.
- **Commit messages:** lowercase imperative, short (`<action> <change>`). **Never** add a `Co-Authored-By` / AI-credit line.
- **Branch:** before Task 1, create `feature/product-polish` off `origin/main` (the current `feature/show-up-rate` branch is already merged):

  ```bash
  git fetch origin
  git switch -c feature/product-polish origin/main
  ```

---

## File Structure

| File | Responsibility | New? |
|------|----------------|------|
| `lib/ui.ts` | shared class strings — add `card`, `btnSecondary`, `emptyCard`; add `min-h-11` to `field` | modify |
| `components/empty-state.tsx` | consistent empty block: `{ message, cta? }` | create |
| `components/section-heading.tsx` | section heading + optional subtitle + optional trailing link | create |
| `app/dashboard/page.tsx` | reorder sections, summary block, History grouping, use helpers | modify |
| `app/games/[id]/page.tsx` | promote facts, dedupe game type, hide empty notes, started banner | modify |
| `app/games/page.tsx` | swap inline empty for `EmptyState` | modify |
| `components/game-form.tsx` | cancel link → `btnSecondary` | modify |
| `components/cancel-game-button.tsx` | "Keep game" → `btnSecondary` | modify |
| `components/game-roster.tsx` | bump `text-[10px]` label to `text-xs` | modify |
| `components/host-attendance-manager.tsx` | 44px buttons, `flex-1` on narrow, `aria-label` + `aria-pressed` | modify |

---

## Task 1: Shared presentation primitives

**Files:**
- Modify: `lib/ui.ts`
- Create: `components/empty-state.tsx`
- Create: `components/section-heading.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `lib/ui.ts` exports `card: string`, `btnSecondary: string`, `emptyCard: string` (and existing `field` now includes `min-h-11`).
  - `EmptyState` (default export) — `({ message: string; cta?: { href: string; label: string } })`.
  - `SectionHeading` (default export) — `({ title: string; subtitle?: string; link?: { href: string; label: string } })`.

- [ ] **Step 1: Add the new class strings to `lib/ui.ts`**

Append after the existing `successPanel` export, and add `min-h-11` to `field`.

Replace the `field` export:

```ts
export const field =
  "w-full min-h-11 border-2 border-ink bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:border-vermilion focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-vermilion";
```

Append:

```ts
export const card = "border-2 border-ink bg-paper p-5";

export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center border-2 border-ink bg-paper px-6 py-3 font-bold uppercase tracking-wide text-ink transition hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60";

export const emptyCard =
  "mt-6 border-2 border-ink bg-paper p-6 text-muted";
```

- [ ] **Step 2: Create `components/empty-state.tsx`**

```tsx
import Link from "next/link";
import { emptyCard, btnSecondary } from "@/lib/ui";

type Props = {
  message: string;
  cta?: { href: string; label: string };
};

export default function EmptyState({ message, cta }: Props) {
  return (
    <div className={emptyCard}>
      <p>{message}</p>
      {cta && (
        <Link href={cta.href} className={`mt-4 ${btnSecondary}`}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `components/section-heading.tsx`**

```tsx
import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
};

export default function SectionHeading({ title, subtitle, link }: Props) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold uppercase tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {link && (
        <Link
          href={link.href}
          className="shrink-0 text-sm font-bold uppercase tracking-wide text-vermilion-ink transition hover:text-ink"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify lint + build**

Run: `npm run lint`
Expected: clean (no errors).

Run: `npm run build`
Expected: compiles successfully (TypeScript clean). The two new components are unused so far — that is fine; they are imported in later tasks.

- [ ] **Step 5: Commit**

```bash
git add lib/ui.ts components/empty-state.tsx components/section-heading.tsx
git commit -m "add shared polish ui helpers"
```

---

## Task 2: Dashboard restructure

**Files:**
- Modify: `app/dashboard/page.tsx` (full replace)

**Interfaces:**
- Consumes: `EmptyState`, `SectionHeading`, and `card` from Task 1; existing data from the unchanged `Promise.all` (`recommendedGames`, `joinedGames`, `hostedGames`, `pastHostedGames`, `pastJoinedGames`, `profile`, `attendance`).
- Produces: nothing for later tasks.

What changes (markup only — no data fetch touched):
1. Ownership-first order: **summary block → Joined → Hosted → Discover → History**.
2. Summary block (`card`): show-up stat + incomplete-profile prompt merged into one block (replaces the buried `showUpText` line and the standalone profile banner).
3. "Upcoming games" renamed **"Discover public runs"** with a "Browse all" → `/games` link, moved below the user's own games.
4. History: one de-emphasized heading with two subsections — **Games you played** (`pastJoinedGames`, always shown, with empty state) and **Games you hosted** (`pastHostedGames`, shown only when present or on error — preserves current behavior, no data merge).
5. All empty states use `EmptyState`; all section headers use `SectionHeading`. Dashboard load-error paragraphs stay inline and unchanged.

- [ ] **Step 1: Replace `app/dashboard/page.tsx` entirely**

```tsx
import Link from "next/link";
import GameCard from "@/components/game-card";
import EmptyState from "@/components/empty-state";
import SectionHeading from "@/components/section-heading";
import SiteHeader from "@/components/site-header";
import {
  fetchCurrentUserHostedGames,
  fetchCurrentUserJoinedGames,
  fetchCurrentUserPastHostedGames,
  fetchCurrentUserPastJoinedGames,
  fetchPublicGames,
} from "@/lib/games";
import { getCurrentProfile, isProfileComplete } from "@/lib/profiles";
import { getCurrentUserAttendanceCounts } from "@/lib/participation";
import { reliability } from "@/lib/reliability";
import { getMatch } from "@/lib/match";
import { btnPrimary, card } from "@/lib/ui";

const loadError = "mt-6 border-2 border-vermilion-ink bg-vermilion-ink/10 p-6 text-vermilion-ink";
const grid = "mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

export default async function DashboardPage() {
  const [
    { games: recommendedGames, error },
    { games: joinedGames, error: joinedError },
    { games: hostedGames, error: hostedError },
    { games: pastHostedGames, error: pastHostedError },
    profile,
    { games: pastJoinedGames, error: pastJoinedError },
    attendance,
  ] = await Promise.all([
    fetchPublicGames(3),
    fetchCurrentUserJoinedGames(),
    fetchCurrentUserHostedGames(),
    fetchCurrentUserPastHostedGames(),
    getCurrentProfile(),
    fetchCurrentUserPastJoinedGames(),
    getCurrentUserAttendanceCounts(),
  ]);

  const displayName = profile?.displayName;
  const { pct, decided } = reliability(attendance.attended, attendance.missed);
  const showUp = attendance.error
    ? null
    : decided === 0
      ? "New"
      : `${pct}% · ${attendance.attended}/${decided} marked games`;
  const profileComplete = isProfileComplete(profile);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-vermilion-ink">
              Dashboard
            </p>
            <h1 className="font-display text-4xl font-bold uppercase leading-tight tracking-tight md:text-5xl">
              Welcome back{displayName ? `, ${displayName}` : ""}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
              Your upcoming runs, the games you host, and public pickup near you.
            </p>
          </div>

          <Link href="/games/new" className={`shrink-0 ${btnPrimary}`}>
            Create a game
          </Link>
        </div>

        {(showUp || !profileComplete) && (
          <div className={`mt-8 ${card}`}>
            {showUp && (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
                  Your show-up rate
                </p>
                <p className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-ink">
                  {showUp}
                </p>
              </>
            )}
            {!profileComplete && (
              <p
                className={`text-sm text-ink ${showUp ? "mt-3 border-t border-line pt-3" : ""}`}
              >
                Complete your{" "}
                <Link
                  href="/profile/setup"
                  className="font-bold text-vermilion-ink hover:text-ink"
                >
                  player profile
                </Link>{" "}
                to improve game matching.
              </p>
            )}
          </div>
        )}

        <div className="mt-12">
          <SectionHeading title="Joined games" subtitle="Games you're already in on." />
          {joinedError ? (
            <p className={loadError}>
              We couldn&apos;t load your joined games right now. Please try again later.
            </p>
          ) : joinedGames.length === 0 ? (
            <EmptyState
              message="You haven't joined any games yet."
              cta={{ href: "/games", label: "Browse public runs" }}
            />
          ) : (
            <div className={grid}>
              {joinedGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-12">
          <SectionHeading title="Hosted games" subtitle="Upcoming pickup runs you organized." />
          {hostedError ? (
            <p className={loadError}>
              We couldn&apos;t load your hosted games right now. Please try again later.
            </p>
          ) : hostedGames.length === 0 ? (
            <EmptyState
              message="You haven't created a game yet."
              cta={{ href: "/games/new", label: "Create a game" }}
            />
          ) : (
            <div className={grid}>
              {hostedGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-12">
          <SectionHeading
            title="Discover public runs"
            subtitle="The next public pickup runs available on HoopFind."
            link={{ href: "/games", label: "Browse all" }}
          />
          {error ? (
            <p className={loadError}>
              We couldn&apos;t load games right now. Please try again later.
            </p>
          ) : recommendedGames.length === 0 ? (
            <EmptyState
              message="No public games yet. Be the first to post a run."
              cta={{ href: "/games/new", label: "Create a game" }}
            />
          ) : (
            <div className={grid}>
              {recommendedGames.map((game) => (
                <GameCard key={game.id} game={game} match={getMatch(profile, game)} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-16 border-t border-line pt-10">
          <h2 className="font-display text-lg font-semibold uppercase tracking-tight text-muted">
            History
          </h2>

          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-wide text-muted">
              Games you played
            </p>
            {pastJoinedError ? (
              <p className={loadError}>
                We couldn&apos;t load your past games right now. Please try again later.
              </p>
            ) : pastJoinedGames.length === 0 ? (
              <EmptyState message="No past games yet — they'll show up here after you play." />
            ) : (
              <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

          {(pastHostedError || pastHostedGames.length > 0) && (
            <div className="mt-8">
              <p className="text-sm font-bold uppercase tracking-wide text-muted">
                Games you hosted
              </p>
              {pastHostedError ? (
                <p className={loadError}>
                  We couldn&apos;t load your past hosted games right now. Please try again later.
                </p>
              ) : (
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {pastHostedGames.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify lint + build**

Run: `npm run lint`
Expected: clean.

Run: `npm run build`
Expected: compiles successfully.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, open `/dashboard` logged in.
Expected: order is summary block → Joined → Hosted → Discover public runs → History (Games you played / Games you hosted). Show-up stat shows in the summary card; incomplete profile prompt appears inside the same card. Empty sections render `EmptyState` cards with CTAs (Joined/Hosted/Discover) and without (Games you played). Kill the dev server (by port) when done.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "reorganize dashboard sections"
```

---

## Task 3: Game detail hierarchy

**Files:**
- Modify: `app/games/[id]/page.tsx` (full replace of the returned JSX; data logic unchanged)

**Interfaces:**
- Consumes: existing page data (`game`, `match`, `hasStarted`, `isCreator`, `rosterAccess`, `roster`, `rosterError`, `host`, `participation`).
- Produces: nothing for later tasks.

What changes (markup only):
1. Move the facts `dl` **above** the match card and join action, directly under the date line.
2. Dedupe game type — remove the "Game type" entry from the `dl` (the title-row badge stays). `dl` becomes 3 columns: Players, Competitiveness, Desired skill range.
3. Hide the Notes block when `game.notes` is empty.
4. Add a neutral "This game has already started" banner when `hasStarted && !game.isCanceled`.

- [ ] **Step 1: Replace the `return (...)` block of `app/games/[id]/page.tsx`**

Everything above `return (` (imports, data fetching, `rosterAccess`, etc.) is unchanged. Replace only the returned JSX with:

```tsx
  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12 max-w-3xl">
          <Link
            href="/games"
            className="text-sm text-muted transition hover:text-ink"
          >
            ← Back to games
          </Link>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-display text-4xl font-bold uppercase leading-tight tracking-tight md:text-5xl">
              {game.title}
            </h1>
            <span className="mt-2 shrink-0 border border-ink px-3 py-1 text-sm font-bold uppercase tracking-wide">
              {game.gameType}
            </span>
          </div>

          <p className="mt-3 text-lg text-muted">
            {game.locationName} · {game.area}
          </p>

          <p className="mt-2 text-base font-semibold text-vermilion-ink">
            {game.dateTimeDisplay}
          </p>

          {game.isCanceled && (
            <p className="mt-4 border-2 border-vermilion-ink bg-vermilion-ink/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-vermilion-ink">
              Canceled by the host
            </p>
          )}

          {!game.isCanceled && hasStarted && (
            <p className="mt-4 border-2 border-ink bg-paper px-4 py-2 text-sm font-bold uppercase tracking-wide text-muted">
              This game has already started
            </p>
          )}

          <dl className="mt-8 grid gap-x-6 gap-y-6 border-t border-line pt-8 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted">Players</dt>
              <dd className="mt-1 text-lg text-ink">
                {game.currentPlayers}/{game.maxPlayers}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-muted">Competitiveness</dt>
              <dd className="mt-1 text-lg text-ink">{game.competitiveness}</dd>
            </div>

            <div>
              <dt className="text-sm text-muted">Desired skill range</dt>
              <dd className="mt-1 text-lg text-ink">
                {game.skillRange.min} – {game.skillRange.max}
              </dd>
            </div>
          </dl>

          <div className="mt-8 border-2 border-ink bg-paper p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted">
              Your match
            </p>
            <MatchLabel match={match} />
          </div>

          <div className="mt-8">
            {game.isCanceled ? (
              <p className="text-base font-medium text-muted">
                This game was canceled by the host.
              </p>
            ) : (
              <GameParticipationButton
                gameId={game.id}
                isAuthenticated={participation.isAuthenticated}
                status={participation.status}
                participationError={participation.error}
                currentPlayers={game.currentPlayers}
                maxPlayers={game.maxPlayers}
                hasStarted={hasStarted}
              />
            )}
          </div>

          {isCreator && !hasStarted && !game.isCanceled && (
            <div className="mt-6 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
              <Link href={`/games/${game.id}/edit`} className={btnPrimary}>
                Edit game
              </Link>
              <CancelGameButton gameId={game.id} />
            </div>
          )}

          {game.notes && (
            <div className="mt-8 border-t border-line pt-8">
              <h2 className="font-display text-sm uppercase text-muted">Notes</h2>
              <p className="mt-2 text-base leading-7 text-muted">{game.notes}</p>
            </div>
          )}

          <div className="mt-8 border-t border-line pt-8">
            <h2 className="font-display text-lg font-semibold uppercase tracking-tight">
              Player roster
            </h2>
            <GameRoster access={rosterAccess} roster={roster} error={rosterError} />
          </div>

          {isCreator && (
            <div className="mt-8 border-t border-line pt-8">
              <h2 className="font-display text-lg font-semibold uppercase tracking-tight">
                Attendance management
              </h2>
              <HostAttendanceManager
                gameId={game.id}
                hasStarted={hasStarted}
                participants={host.participants}
                error={host.error}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
```

- [ ] **Step 2: Verify lint + build**

Run: `npm run lint`
Expected: clean.

Run: `npm run build`
Expected: compiles successfully.

- [ ] **Step 3: Manual check**

`npm run dev`, open a game detail page.
Expected: Players / Competitiveness / Desired skill range appear directly under the date, above the "Your match" box and join button. Game type shows once (title badge only). A game with empty notes shows no "Notes" heading. Open a started/past game → neutral "This game has already started" banner, disabled join, no host edit/cancel. Open a canceled game → canceled banner, no host controls. Kill the dev server by port.

- [ ] **Step 4: Commit**

```bash
git add "app/games/[id]/page.tsx"
git commit -m "improve game detail hierarchy"
```

---

## Task 4: Secondary buttons, empty-state & roster consistency

**Files:**
- Modify: `app/games/page.tsx`
- Modify: `components/game-form.tsx:321-326`
- Modify: `components/cancel-game-button.tsx:47-53`
- Modify: `components/game-roster.tsx:53`

**Interfaces:**
- Consumes: `EmptyState` and `btnSecondary` from Task 1.
- Produces: nothing for later tasks.

- [ ] **Step 1: `app/games/page.tsx` — swap inline empty for `EmptyState`**

Add the import after the `SiteHeader` import:

```tsx
import EmptyState from "@/components/empty-state";
```

Replace the empty-state branch (the `games.length === 0` paragraph):

```tsx
        ) : games.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              message="No public games yet. Be the first to post a run."
              cta={{ href: "/games/new", label: "Create a game" }}
            />
          </div>
        ) : (
```

(The error branch directly above it stays unchanged.)

- [ ] **Step 2: `components/game-form.tsx` — cancel link → `btnSecondary`**

Add `btnSecondary` to the existing `lib/ui` import (line 7):

```tsx
import { field, label, btnPrimary, btnSecondary, errorPanel, successPanel } from "@/lib/ui";
```

Replace the cancel `Link` (currently a bare text link) at the bottom of the form:

```tsx
        <Link
          href={mode === "edit" ? `/games/${gameId}` : "/dashboard"}
          className={btnSecondary}
        >
          Cancel and go back
        </Link>
```

- [ ] **Step 3: `components/cancel-game-button.tsx` — "Keep game" → `btnSecondary`**

Add `btnSecondary` to the import (line 6):

```tsx
import { btnPrimary, btnSecondary, errorPanel } from "@/lib/ui";
```

Replace the "Keep game" button:

```tsx
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className={btnSecondary}
        >
          Keep game
        </button>
```

- [ ] **Step 4: `components/game-roster.tsx` — bump tiny label**

Replace the `text-[10px]` show-up label (line 53):

```tsx
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  Show-up rate
                </p>
```

- [ ] **Step 5: Verify lint + build**

Run: `npm run lint`
Expected: clean.

Run: `npm run build`
Expected: compiles successfully.

- [ ] **Step 6: Manual check**

`npm run dev`:
- `/games` with no public games → `EmptyState` card with a "Create a game" button.
- `/games/new` and `/games/<id>/edit` → "Cancel and go back" is now a bordered secondary button.
- Game detail as host → "Cancel game" → confirm → "Keep game" is a bordered secondary button.
- Game roster → "Show-up rate" label is `text-xs` (not 10px).
Kill the dev server by port.

- [ ] **Step 7: Commit**

```bash
git add app/games/page.tsx components/game-form.tsx components/cancel-game-button.tsx components/game-roster.tsx
git commit -m "use secondary buttons and consistent empty states"
```

---

## Task 5: Attendance button touch targets + accessibility

**Files:**
- Modify: `components/host-attendance-manager.tsx:36-37` (the `baseBtn` constant) and `:99-124` (the two buttons)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing for later tasks.

What changes:
1. `baseBtn` gains `inline-flex items-center justify-center min-h-11 flex-1 sm:flex-none` so each button is ≥44px tall and stretches on narrow screens.
2. Each button gets `aria-label="Mark {displayName} as attended/missed"` and `aria-pressed` reflecting the current status.

- [ ] **Step 1: Update `baseBtn`**

Replace the `baseBtn` constant (lines 36-37):

```tsx
const baseBtn =
  "inline-flex min-h-11 flex-1 items-center justify-center border-2 px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none";
```

- [ ] **Step 2: Add `aria-label` + `aria-pressed` to the two buttons**

Replace the buttons block (the `hasStarted &&` group, lines ~98-124):

```tsx
            {hasStarted && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => mark(p.userId, "attended")}
                  disabled={pendingId !== null}
                  aria-label={`Mark ${p.displayName} as attended`}
                  aria-pressed={p.status === "attended"}
                  className={`${baseBtn} ${
                    p.status === "attended"
                      ? "border-success bg-success/10 text-success"
                      : "border-ink text-muted hover:border-vermilion"
                  }`}
                >
                  Attended
                </button>
                <button
                  type="button"
                  onClick={() => mark(p.userId, "missed")}
                  disabled={pendingId !== null}
                  aria-label={`Mark ${p.displayName} as missed`}
                  aria-pressed={p.status === "missed"}
                  className={`${baseBtn} ${
                    p.status === "missed"
                      ? "border-vermilion-ink bg-vermilion-ink/10 text-vermilion-ink"
                      : "border-ink text-muted hover:border-vermilion"
                  }`}
                >
                  Missed
                </button>
              </div>
            )}
```

- [ ] **Step 3: Verify lint + build**

Run: `npm run lint`
Expected: clean.

Run: `npm run build`
Expected: compiles successfully.

- [ ] **Step 4: Manual check**

`npm run dev`, open a started game you host with at least one participant.
Expected: Attended / Missed buttons are ≥44px tall, stretch to fill the row on a narrow (~360px) viewport, and sit side-by-side on `sm+`. Inspect the DOM (or use a screen reader): each button has `aria-label="Mark {name} as attended/missed"`, and the active status button has `aria-pressed="true"`. Mark a player and confirm the pressed state moves. Kill the dev server by port.

- [ ] **Step 5: Commit**

```bash
git add components/host-attendance-manager.tsx
git commit -m "improve attendance button accessibility"
```

---

## Final manual QA (whole spec)

After all tasks, run the spec's QA checklist once end-to-end (`npm run dev`):

- [ ] Dashboard order: Joined + Hosted above Discover; History last and de-emphasized.
- [ ] Summary block shows show-up stat (`%`/`New`) and the incomplete-profile prompt links to `/profile/setup`.
- [ ] New account shows consistent `EmptyState` cards (Joined/Hosted with CTAs, Games-you-played without).
- [ ] Discover empty → `EmptyState`; forced fetch error → load-error paragraph (no raw Supabase text).
- [ ] Detail: Players/Skill/Competitiveness above the match card; game type shown once; empty notes hidden.
- [ ] Started game → "already started" banner, disabled join, no host controls. Canceled → canceled banner, no host controls.
- [ ] Roster access: logged-out and non-member still blocked.
- [ ] Touch targets: form inputs and attendance buttons ≥44px on mobile; secondary buttons tappable.
- [ ] Attendance buttons expose `aria-label="Mark {displayName} as attended/missed"` and `aria-pressed`.
- [ ] Focus visible on every interactive element via keyboard.
- [ ] Contrast: no meaningful text below `text-xs`.
- [ ] **~360px width:** dashboard and game detail have no horizontal scroll, long titles wrap, badges/buttons don't squeeze; forms also clear at 360px.

Then `finishing-a-development-branch` to merge/PR. **No `Co-Authored-By` line in any commit or PR.**

---

## Self-Review (against the spec)

- **Dashboard organization** (spec §1) → Task 2: summary block, ownership-first order, Discover rename + Browse all, History grouping, consistent empties. ✓
- **Game detail hierarchy** (spec §2) → Task 3: facts promoted, game type deduped, empty notes hidden, started banner. ✓
- **Empty states** (spec §3) → Task 1 (`EmptyState`) + Task 2 (dashboard) + Task 4 (`/games`); roster empties already use `note`, unchanged. ✓
- **Mobile** (spec §4) → Task 1 (`field min-h-11`) + Task 5 (attendance 44px + `flex-1`) + Task 4 (secondary buttons as larger targets) + Task 3 (`flex-wrap` title row). ✓
- **Accessibility** (spec §5) → Task 5 (`aria-label`/`aria-pressed`) + Task 4 (roster `text-[10px]`→`text-xs`); existing focus-visible preserved across all tasks. ✓
- **Scope boundaries** (spec §6) → Global Constraints; no schema/auth/RLS/timezone/attendance/reliability/matching/query changes; only `lib/ui.ts` + markup; two tiny new components; no deps. ✓
- **History MVP** (revised spec) → Task 2 keeps `pastJoinedGames`/`pastHostedGames` as separate subsections, no data merge. ✓

No placeholders; types consistent (`EmptyState`/`SectionHeading` prop shapes match every call site; `card`/`btnSecondary`/`emptyCard` defined in Task 1, consumed in Tasks 2/4).
