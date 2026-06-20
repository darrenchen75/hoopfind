# Editorial Design System Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every HoopFind app page to the editorial design system already used on the landing page, driven by a shared token layer.

**Architecture:** Lift colors + fonts into a shared token layer (`@theme` in `globals.css`, fonts in `app/layout.tsx`), add one `lib/ui.ts` of shared class strings, restyle the shared components once, then restyle each page shell. Finally dedupe the landing page to consume the same tokens. No logic changes anywhere — class/markup only.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, `next/font/google`, Supabase.

## Global Constraints

- No new dependencies.
- No changes to logic, props, handlers, Supabase calls, routing, or auth. Class/markup edits only.
- Light editorial theme only — dark mode is removed.
- Palette (exact hex): `paper #EFEAE2` · `ink #16130F` · `vermilion #FF3B1D` · `vermilion-ink #C41E0E` · `muted #6B6256` · `line #D8D0C2` · `success #3C6B47`.
- Fonts: Big Shoulders (display), Inter (body/base), Newsreader (serif italic accents).
- Accessibility floor: visible `focus-visible` outline on every interactive element, semantic HTML preserved, WCAG AA text contrast, no horizontal scroll, mobile layout intact.
- No automated test suite exists. **Per-task verification = `npm run lint` and `npm run build` both clean** (build runs TypeScript). Treat these as the test cycle.
- Copy is unchanged except where a class edit unavoidably touches a string; do not rewrite content.
- Commit after each task with a short lowercase imperative message (no co-author/attribution trailer — repo preference).

---

## File Structure

**Created:**
- `lib/ui.ts` — shared button/field/label/panel/note class strings.

**Modified — token layer:**
- `app/globals.css` — `@theme` tokens, remove dark mode + Arial.
- `app/layout.tsx` — editorial fonts.

**Modified — shared components:**
- `components/site-header.tsx`, `components/auth-nav.tsx`, `components/logout-button.tsx`
- `components/game-card.tsx`, `components/match-label.tsx`
- `components/auth-form.tsx`, `components/profile-form.tsx`, `components/create-game-form.tsx`
- `components/game-roster.tsx`, `components/attendance-list.tsx`, `components/host-attendance-manager.tsx`, `components/game-participation-button.tsx`

**Modified — page shells:**
- `app/dashboard/page.tsx`, `app/games/page.tsx`, `app/games/[id]/page.tsx`, `app/games/new/page.tsx`, `app/login/page.tsx`, `app/signup/page.tsx`, `app/profile/setup/page.tsx`

**Modified — landing dedupe:**
- `app/page.tsx`

## Canonical class mapping (used throughout)

When restyling, replace old dark/orange utilities with these editorial equivalents:

| Old | New |
|-----|-----|
| `bg-zinc-950 text-white` (page main) | `bg-paper text-ink` |
| `text-orange-400` (eyebrow) | `text-vermilion-ink` |
| `text-orange-400` / `text-orange-300` (links) | `text-vermilion-ink` + `hover:text-ink` |
| `bg-orange-500 ... text-white ... hover:bg-orange-400` (button) | `btnPrimary` from `lib/ui` |
| `text-zinc-300` / `text-zinc-400` (body/secondary) | `text-muted` |
| `text-zinc-100` / `text-zinc-200` (strong text) | `text-ink` |
| `text-zinc-500` (faint labels) | `text-muted` |
| `border-zinc-800 bg-zinc-900/50` (card/note) | `border-2 border-ink bg-paper` |
| `border-red-900 bg-red-950/50 text-red-300` (error) | `errorPanel` from `lib/ui` |
| `border-green-900 bg-green-950/50 text-green-300` (success) | `successPanel` from `lib/ui` |
| section heading `h1`/`h2` | add `font-display` + `uppercase` (display face) |

Headings use the `font-display` utility (Big Shoulders) with `font-black uppercase`; section eyebrows use `text-vermilion-ink` uppercase; dividers use `border-line`.

---

## Task 1: Token layer (fonts + colors, drop dark mode)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: Tailwind utilities `bg-paper bg-ink bg-vermilion text-ink text-paper text-vermilion text-vermilion-ink text-muted text-success border-ink border-line` and font utilities `font-sans` (default Inter), `font-display`, `font-serif`. CSS variables `--ff-display`, `--ff-body`, `--ff-serif` on `<html>`.

- [ ] **Step 1: Replace `app/layout.tsx` with editorial fonts**

```tsx
import type { Metadata } from "next";
import { Big_Shoulders, Inter, Newsreader } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({ subsets: ["latin"], variable: "--ff-display" });
const body = Inter({ subsets: ["latin"], variable: "--ff-body" });
const serif = Newsreader({
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--ff-serif",
});

export const metadata: Metadata = {
  title: "HoopFind",
  description: "Find nearby basketball games that match your level.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Replace `app/globals.css` with token theme**

```css
@import "tailwindcss";

@theme {
  --color-paper: #efeae2;
  --color-ink: #16130f;
  --color-vermilion: #ff3b1d;
  --color-vermilion-ink: #c41e0e;
  --color-muted: #6b6256;
  --color-line: #d8d0c2;
  --color-success: #3c6b47;

  --font-sans: var(--ff-body);
  --font-display: var(--ff-display);
  --font-serif: var(--ff-serif);
}

body {
  background-color: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
}
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: lint clean; build compiles, TypeScript passes, all routes build. (Pages still use zinc/orange classes — they will look mismatched until later tasks; that is expected and the build still passes because those utilities still exist.)

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "add editorial token layer"
```

---

## Task 2: Shared UI class strings (`lib/ui.ts`)

**Files:**
- Create: `lib/ui.ts`

**Interfaces:**
- Produces: `btnPrimary`, `btnSecondary`, `field`, `label`, `note`, `errorPanel`, `successPanel` (all `string`).

- [ ] **Step 1: Create `lib/ui.ts`**

```ts
// Shared editorial class strings. Consumed by forms, buttons, and panels so
// styling stays consistent without per-file drift.

export const btnPrimary =
  "inline-flex items-center justify-center bg-vermilion px-6 py-3 font-bold uppercase tracking-wide text-ink transition hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60";

export const btnSecondary =
  "inline-flex items-center justify-center border-2 border-ink px-6 py-3 font-bold uppercase tracking-wide text-ink transition hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion disabled:cursor-not-allowed disabled:opacity-60";

export const field =
  "w-full border-2 border-ink bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:border-vermilion focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-vermilion";

export const label =
  "mb-2 block text-sm font-bold uppercase tracking-wide text-ink";

export const note = "mt-4 border-2 border-ink bg-paper p-5 text-muted";

export const errorPanel =
  "border-2 border-vermilion-ink bg-vermilion-ink/10 px-3 py-2 text-sm text-vermilion-ink";

export const successPanel =
  "border-2 border-success bg-success/10 px-3 py-2 text-sm text-success";
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build`
Expected: clean. (Exports are unused so far — that is fine; ESLint does not flag unused module exports.)

- [ ] **Step 3: Commit**

```bash
git add lib/ui.ts
git commit -m "add shared editorial ui class strings"
```

---

## Task 3: Navigation components

**Files:**
- Modify: `components/site-header.tsx`
- Modify: `components/auth-nav.tsx`
- Modify: `components/logout-button.tsx`

**Interfaces:**
- Consumes: token utilities from Task 1.
- Produces: editorial `SiteHeader` used by all page shells.

- [ ] **Step 1: Replace `components/site-header.tsx`**

```tsx
import Link from "next/link";
import AuthNav from "@/components/auth-nav";

export default function SiteHeader() {
  return (
    <header className="border-b-2 border-ink">
      <nav className="flex items-center justify-between py-4">
        <Link
          href="/"
          className="font-display text-3xl font-black uppercase tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion"
        >
          HoopFind
        </Link>

        <div className="flex items-center gap-5 text-sm font-semibold">
          <Link
            href="/games"
            className="hover:text-vermilion-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion"
          >
            Browse games
          </Link>
          <AuthNav />
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Replace `components/auth-nav.tsx`** (logic identical; only the returned JSX classes change)

Keep lines 1–28 exactly as they are (the `"use client"`, imports, `useEffect`, and the `if (loggedIn === null) return null;`). Replace the two returned fragments (lines 29–55) with:

```tsx
  if (loggedIn) {
    return (
      <>
        <Link
          href="/dashboard"
          className="hover:text-vermilion-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion"
        >
          Dashboard
        </Link>
        <Link
          href="/profile/setup"
          className="hover:text-vermilion-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion"
        >
          Profile
        </Link>
        <LogoutButton />
      </>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="hover:text-vermilion-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion"
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="bg-vermilion px-4 py-1.5 font-bold uppercase tracking-wide text-ink transition hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Sign up
      </Link>
    </>
  );
```

- [ ] **Step 3: Update `components/logout-button.tsx`** — change only the button `className` (line 23):

Replace:
```tsx
      className="hover:text-white disabled:opacity-60"
```
with:
```tsx
      className="font-semibold hover:text-vermilion-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vermilion disabled:opacity-60"
```

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/site-header.tsx components/auth-nav.tsx components/logout-button.tsx
git commit -m "restyle navigation to editorial"
```

---

## Task 4: Game card and match label

**Files:**
- Modify: `components/game-card.tsx`
- Modify: `components/match-label.tsx`

**Interfaces:**
- Consumes: token utilities; `PickupGame`, `MatchResult`/`MatchLabel` types (unchanged).

- [ ] **Step 1: Replace `components/game-card.tsx`**

```tsx
import Link from "next/link";

import type { PickupGame } from "@/lib/types";

export default function GameCard({ game }: { game: PickupGame }) {
  return (
    <Link
      href={`/games/${game.id}`}
      className="group flex flex-col border-2 border-ink bg-paper p-5 transition hover:bg-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-black uppercase leading-none">
          {game.title}
        </h2>
        <span className="shrink-0 border border-ink px-2 py-1 text-xs font-bold uppercase tracking-wide">
          {game.gameType}
        </span>
      </div>

      <p className="mt-2 text-sm text-muted">
        {game.locationName} · {game.area}
      </p>

      <p className="mt-3 text-sm font-semibold text-vermilion-ink">
        {game.dateTimeDisplay}
      </p>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3 text-sm">
        <div className="flex gap-1.5">
          <dt className="text-muted">Players</dt>
          <dd className="font-semibold">
            {game.currentPlayers}/{game.maxPlayers}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted">Speed</dt>
          <dd className="font-semibold">{game.competitiveness}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted">Skill</dt>
          <dd className="font-semibold">
            {game.skillRange.min}–{game.skillRange.max}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-sm leading-6 text-muted">{game.notes}</p>
    </Link>
  );
}
```

- [ ] **Step 2: Replace the `labelStyles` map in `components/match-label.tsx`** (lines 3–8) with:

```tsx
const labelStyles: Record<MatchLabel, string> = {
  "Good Fit": "border-success text-success",
  "Might Be Too Competitive": "border-vermilion-ink text-vermilion-ink",
  "Might Be Too Casual": "border-ink text-muted",
  "Missing Profile Info": "border-line text-muted",
};
```

And in the same file change the badge `<span>` (line 13–14) to square, 2px border, and the reason `<p>` to muted:

```tsx
      <span
        className={`inline-flex border-2 px-3 py-1 text-sm font-bold uppercase tracking-wide ${labelStyles[match.label]}`}
      >
        {match.label}
      </span>
      <p className="mt-2 text-sm leading-6 text-muted">{match.reason}</p>
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/game-card.tsx components/match-label.tsx
git commit -m "restyle game card and match label"
```

---

## Task 5: Forms

**Files:**
- Modify: `components/auth-form.tsx`
- Modify: `components/profile-form.tsx`
- Modify: `components/create-game-form.tsx`

**Interfaces:**
- Consumes: `field`, `label`, `btnPrimary`, `errorPanel`, `successPanel` from `lib/ui` (Task 2).

All three forms share the same dark `fieldClasses`/`labelClasses` consts and the same button/error/success patterns. For **each** form apply this shared mapping:

1. Add import: `import { field, label, btnPrimary, errorPanel, successPanel } from "@/lib/ui";`
2. Delete the local `const fieldClasses = ...` and `const labelClasses = ...` lines.
3. Replace every `className={fieldClasses}` with `className={field}` and every `className={labelClasses}` with `className={label}`.
4. Replace the error `<p>` (`className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300"`) with `className={errorPanel}`.
5. Replace the success `<p>` (`className="rounded-lg border border-green-900 bg-green-950/50 px-3 py-2 text-sm text-green-300"`) with `className={successPanel}`.
6. Replace the submit `<button>` className (the `rounded-full bg-orange-500 ...` string) with `className={btnPrimary}`.

Then the per-file extras:

- [ ] **Step 1: `auth-form.tsx`** — also restyle the header block (lines 94–101) and alt link (lines 159–164):

```tsx
    <div className="mt-12 w-full max-w-md">
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-vermilion-ink">
        {text.eyebrow}
      </p>
      <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight">
        {text.title}
      </h1>
      <p className="mt-4 text-lg leading-8 text-muted">{text.subtitle}</p>
```

```tsx
      <p className="mt-6 text-sm text-muted">
        {text.altText}{" "}
        <Link
          href={text.altHref}
          className="font-bold text-vermilion-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion"
        >
          {text.altLink}
        </Link>
      </p>
```

- [ ] **Step 2: `profile-form.tsx`** — apply the shared mapping (1–6). Also restyle the loading + unauthenticated states (lines 134–150) and the cancel link (lines 331–336):

```tsx
  if (status === "loading") {
    return <p className="mt-10 text-sm text-muted">Loading…</p>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="mt-10 border-2 border-ink bg-paper p-6">
        <p className="text-muted">
          You need to be logged in to set up your profile.
        </p>
        <Link href="/login" className={`mt-4 ${btnPrimary}`}>
          Go to login
        </Link>
      </div>
    );
  }
```

```tsx
        <Link
          href="/dashboard"
          className="text-center text-sm font-bold uppercase tracking-wide text-muted transition hover:text-ink"
        >
          Back to dashboard
        </Link>
```

(`btnPrimary` is `inline-flex`, so the `mt-4 ${btnPrimary}` wrapper renders the link as a block-level button correctly.)

- [ ] **Step 3: `create-game-form.tsx`** — apply the shared mapping (1–6). Also restyle the loading + unauthenticated states (lines 148–164) and cancel link (lines 367–372), identical pattern to profile-form but with this copy:

```tsx
  if (status === "loading") {
    return <p className="mt-10 text-sm text-muted">Loading…</p>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="mt-10 border-2 border-ink bg-paper p-6">
        <p className="text-muted">You need to be logged in to create a game.</p>
        <Link href="/login" className={`mt-4 ${btnPrimary}`}>
          Go to login
        </Link>
      </div>
    );
  }
```

```tsx
        <Link
          href="/dashboard"
          className="text-center text-sm font-bold uppercase tracking-wide text-muted transition hover:text-ink"
        >
          Cancel and go back
        </Link>
```

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run build`
Expected: clean. Manually confirm in `npm run dev` that `/login`, `/signup` submit and show errors styled in vermilion.

- [ ] **Step 5: Commit**

```bash
git add components/auth-form.tsx components/profile-form.tsx components/create-game-form.tsx
git commit -m "restyle forms to editorial"
```

---

## Task 6: Roster and attendance components

**Files:**
- Modify: `components/game-roster.tsx`
- Modify: `components/attendance-list.tsx`
- Modify: `components/host-attendance-manager.tsx`
- Modify: `components/game-participation-button.tsx`

**Interfaces:**
- Consumes: `btnPrimary`, `errorPanel`, `note` from `lib/ui`; token utilities.

- [ ] **Step 1: `game-roster.tsx`** — replace the `note` const (line 9) and the roster `<li>`/`<dt>`/`<dd>` classes:

```tsx
const note = "mt-4 border-2 border-ink bg-paper p-5 text-muted";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm text-ink">{value || "Not provided"}</dd>
    </div>
  );
}
```

And the roster list `<li>` (lines 40–44):
```tsx
        <li key={i} className="border-2 border-ink bg-paper p-4">
          <p className="text-base font-semibold text-ink">{entry.displayName}</p>
```

- [ ] **Step 2: `attendance-list.tsx`** — replace `statusStyles` (lines 3–7) and the list classes:

```tsx
const statusStyles: Record<AttendanceStatus, string> = {
  Joined: "border-ink text-muted",
  Attended: "border-success text-success",
  Missed: "border-vermilion-ink text-vermilion-ink",
};
```

Empty state (line 12): `className="mt-2 text-base text-muted"`.
List item (line 20): `className="flex items-center justify-between border-2 border-ink bg-paper px-4 py-3"`.
Name span (line 22): `className="text-base text-ink"`.
Status badge (line 24): `className={`inline-flex border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyles[player.status]}`}`.

- [ ] **Step 3: `host-attendance-manager.tsx`** — apply token mapping at these locations:

- `note` const (line 36): `const note = "mt-4 border-2 border-ink bg-paper p-5 text-muted";`
- `baseBtn` (line 37–38): `const baseBtn = "border-2 px-4 py-1.5 text-sm font-bold uppercase tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion disabled:cursor-not-allowed disabled:opacity-50";`
- pre-start hint `<p>` (line 81): `className="border-2 border-ink bg-paper px-4 py-3 text-sm text-muted"`
- participant `<li>` (line 90): `className="flex flex-col gap-3 border-2 border-ink bg-paper p-4 sm:flex-row sm:items-center sm:justify-between"`
- name `<p>` (line 93): `text-ink`; status `<p>` (line 96): `text-muted`
- "Attended" button active/inactive (lines 106–108):
  active `"border-success bg-success/10 text-success"`, inactive `"border-ink text-muted hover:border-vermilion"`
- "Missed" button active/inactive (lines 118–120):
  active `"border-vermilion-ink bg-vermilion-ink/10 text-vermilion-ink"`, inactive `"border-ink text-muted hover:border-vermilion"`
- error `<p>` (lines 131–133): replace with `import { errorPanel } from "@/lib/ui"` and `className={errorPanel}` (drop the `mt-…`? keep wrapper spacing via the parent gap — use `className={errorPanel}`).

- [ ] **Step 4: `game-participation-button.tsx`** — replace `buttonClasses` (lines 9–10) and feedback classes:

```tsx
import { btnPrimary, errorPanel } from "@/lib/ui";
```
Delete the local `buttonClasses` const and use `btnPrimary` everywhere `buttonClasses` was referenced (lines 67, 105, 129; the `inline-block ${buttonClasses}` on line 67 becomes `inline-block ${btnPrimary}` — though `btnPrimary` is already `inline-flex`, keep the `inline-block` prefix harmless or drop it; drop it for cleanliness: `className={btnPrimary}`).
- participation-error `<p>` (line 76): `className="text-base text-muted"`
- joined `<p>` (line 93): `className="text-base font-semibold text-success"`
- disabled-reason / has-started `<p>` (lines 97, 133): `text-muted`
- `ErrorMessage` `<p>` (lines 141–144): `className={errorPanel}`.

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add components/game-roster.tsx components/attendance-list.tsx components/host-attendance-manager.tsx components/game-participation-button.tsx
git commit -m "restyle roster and attendance to editorial"
```

---

## Task 7: Page shells

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/games/page.tsx`
- Modify: `app/games/[id]/page.tsx`
- Modify: `app/games/new/page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/signup/page.tsx`
- Modify: `app/profile/setup/page.tsx`

**Interfaces:**
- Consumes: restyled `SiteHeader`, `GameCard`, `MatchLabel`, participation/roster/attendance components; `btnPrimary` from `lib/ui`.

For **every** page apply: `main` `bg-zinc-950 text-white` → `bg-paper text-ink`; eyebrow `text-orange-400` → `text-vermilion-ink`; `h1`/`h2` add `font-display uppercase` and keep size; body `text-zinc-300/400` → `text-muted`; any `bg-orange-500 ...` button → `btnPrimary`; card/note `border-zinc-800 bg-zinc-900/50` → `border-2 border-ink bg-paper`; error panels → `errorPanel`; section dividers `border-zinc-800` → `border-line`; links `text-orange-400 hover:text-orange-300` → `text-vermilion-ink hover:text-ink`.

- [ ] **Step 1: `login/page.tsx`, `signup/page.tsx`** — change only the `main` className:

```tsx
    <main className="min-h-screen bg-paper text-ink">
```

- [ ] **Step 2: `games/new/page.tsx`, `profile/setup/page.tsx`** — change `main` to `bg-paper text-ink`; eyebrow `text-orange-400` → `text-vermilion-ink`; `h1` add `font-display uppercase`:

```tsx
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-vermilion-ink">
            {/* existing eyebrow text */}
          </p>
          <h1 className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight">
            {/* existing h1 text */}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            {/* existing subtitle text */}
          </p>
        </div>
        {/* existing form component */}
```

- [ ] **Step 3: `games/page.tsx`** — `main` → `bg-paper text-ink`; eyebrow → `text-vermilion-ink`; `h1` add `font-display uppercase`; subtitle → `text-muted`; error panel → `errorPanel`; empty-state note → `border-2 border-ink bg-paper p-6 text-muted`. (GameCard already restyled in Task 4.)

```tsx
    <main className="min-h-screen bg-paper text-ink">
```
Eyebrow: `className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-vermilion-ink"`
H1: `className="font-display text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-6xl"`
Subtitle: `className="mt-4 max-w-2xl text-lg leading-8 text-muted"`
Error `<p>`: `className="mt-10 border-2 border-vermilion-ink bg-vermilion-ink/10 p-6 text-vermilion-ink"`
Empty `<p>`: `className="mt-10 border-2 border-ink bg-paper p-6 text-muted"`

- [ ] **Step 4: `dashboard/page.tsx`** — apply the per-page mapping:
- `main`: `bg-paper text-ink`
- eyebrow (line 35): `text-vermilion-ink` + `font-bold`
- `h1` (line 38): add `font-display uppercase`
- subtitle (line 41) + `h2`s (68, 91, 119, 150) + sub `<p>`s (69, 92, 120, 151): `font-display uppercase` on the `h2`s, `text-muted` on the `<p>`s
- "Create a game" button (lines 46–49): `className={`shrink-0 ${btnPrimary}`}` (add `import { btnPrimary } from "@/lib/ui";`)
- profile-incomplete banner (lines 54–56): `className="mt-8 border-2 border-vermilion bg-vermilion/10 p-4 text-sm text-ink"`; the inner link (59) `className="font-bold text-vermilion-ink hover:text-ink"`
- error `<p>`s (74, 95, 125, 156): `className="mt-6 border-2 border-vermilion-ink bg-vermilion-ink/10 p-6 text-vermilion-ink"`
- empty `<p>`s (78, 99, 129): `className="mt-6 border-2 border-ink bg-paper p-6 text-muted"`; inner links `className="font-bold text-vermilion-ink hover:text-ink"`

- [ ] **Step 5: `games/[id]/page.tsx`** — apply the per-page mapping:
- `main`: `bg-paper text-ink`
- back link (62–65): `className="text-sm text-muted transition hover:text-ink"`
- `h1` (70): add `font-display uppercase`
- game-type badge (73): `className="mt-2 shrink-0 border border-ink px-3 py-1 text-sm font-bold uppercase tracking-wide"`
- location `<p>` (78): `text-muted`; date `<p>` (82): `text-vermilion-ink font-semibold`
- "Your match" card (86): `className="mt-8 border-2 border-ink bg-paper p-5"`; its eyebrow (87): `text-muted` → keep, change to `text-muted font-bold uppercase`
- the `<dl>` divider (105) `border-t border-zinc-800` → `border-t border-line`; `<dt>`s `text-zinc-500` → `text-muted`; `<dd>`s `text-zinc-100` → `text-ink`
- the Notes / Roster / Attendance section dividers (133, 140, 146) `border-zinc-800` → `border-line`; their `<h2>`s add `font-display uppercase`; notes `<p>` (135) `text-zinc-300` → `text-muted`; the Notes label `<h2>` (134) `text-zinc-500` → `text-muted`

- [ ] **Step 6: Verify**

Run: `npm run lint && npm run build`
Expected: clean. In `npm run dev` load all 7 routes; confirm no zinc/orange remains and forms/buttons work.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/page.tsx app/games/page.tsx "app/games/[id]/page.tsx" app/games/new/page.tsx app/login/page.tsx app/signup/page.tsx app/profile/setup/page.tsx
git commit -m "restyle page shells to editorial"
```

---

## Task 8: Landing dedupe

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: token utilities + layout fonts (Task 1).

The landing currently defines its own `palette` object, imports `next/font` at module scope, and uses `bg-[var(--c-…)]` arbitrary classes. Migrate it to the shared tokens.

- [ ] **Step 1: Remove module-scope font setup** — delete the `import { Big_Shoulders, Inter, Newsreader } from "next/font/google";` line and the `display`/`body`/`serif` `const` declarations, and delete the `palette` object and the `dStyle`/`sStyle` consts.

- [ ] **Step 2: Swap inline styles for utilities** — across the file:
  - `style={palette}` on `<main>` → remove; `${body.className} ${display.variable} ${serif.variable}` → remove (fonts now come from layout).
  - `style={dStyle}` on headings → remove, add `font-display` to the element's className.
  - `style={sStyle}` on italic text → remove, add `font-serif` to className.
  - `bg-[var(--c-paper)]` → `bg-paper`; `text-[var(--c-ink)]` → `text-ink`; `bg-[var(--c-vermilion)]` → `bg-vermilion`; `text-[var(--c-vermilion)]` → `text-vermilion`; `text-[var(--c-vermilion-ink)]` → `text-vermilion-ink`; `text-[var(--c-muted)]` → `text-muted`; `border-[var(--c-ink)]` → `border-ink`; `border-[var(--c-line)]` → `border-line`; `bg-[var(--c-ink)]` → `bg-ink`; `text-[var(--c-paper)]` → `text-paper`.
  - `fitBadge`/`FitDot`/`mapBg` keep their logic; swap any `var(--c-…)` references for the equivalent token utility or `var(--color-…)` (e.g. `mapBg`'s `backgroundColor`/lines can keep literal hex `#E7E1D5`/`#D8D0C2`, or use `var(--color-line)`).
  - The `HalfCourt` SVG uses `var(--c-vermilion)`/`var(--c-paper)` fills → change to `var(--color-vermilion)`/`var(--color-paper)`.

- [ ] **Step 3: Verify visually unchanged**

Run: `npm run lint && npm run build`
Expected: clean. In `npm run dev`, `/` looks identical to before the dedupe.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "dedupe landing to shared tokens"
```

---

## Task 9: Cleanup sweep and final verification

**Files:**
- Modify: any file still containing legacy color utilities.

- [ ] **Step 1: Grep for leftover legacy colors**

Run:
```bash
grep -rnE "zinc-|orange-|emerald-|sky-|red-9|red-3|red-5|green-9|green-3|bg-\[var\(--c-" app components | grep -v node_modules
```
Expected: no matches. Any match is a missed spot — restyle it with the canonical mapping table, keeping `red/green` semantic uses mapped to `vermilion-ink`/`success`.

- [ ] **Step 2: Final build + manual pass**

Run: `npm run lint && npm run build`
Expected: clean.

In `npm run dev`, load `/`, `/games`, a game detail, `/games/new`, `/login`, `/signup`, `/profile/setup`, `/dashboard` (logged in) and confirm:
- consistent editorial look, no dark/orange leftovers
- forms submit; login/signup/create-game/profile work
- keyboard focus visible everywhere; no horizontal scroll; mobile layout intact

- [ ] **Step 3: Commit any stragglers**

```bash
git add -A
git commit -m "clean up remaining legacy color utilities"
```

(If Step 1 found nothing and no edits were needed, skip the commit.)

---

## Self-Review (completed by plan author)

- **Spec coverage:** token layer → Task 1; feedback colors → Tasks 4/6/7 (MatchLabel, attendance, panels); shared components → Tasks 3–6; `lib/ui.ts` → Task 2; page shells → Task 7; landing dedupe → Task 8; dark-mode removal → Task 1; cleanup grep (spec risk mitigation) → Task 9. All spec sections mapped.
- **Placeholders:** none — every class string and file edit is spelled out; `{/* existing … text */}` markers in Task 7 Step 2 refer to copy that must be left verbatim, which is intentional (copy is out of scope).
- **Type consistency:** `lib/ui.ts` exports (`btnPrimary`, `btnSecondary`, `field`, `label`, `note`, `errorPanel`, `successPanel`) are referenced by those exact names in Tasks 5–7. `MatchLabel` keys match `lib/match.ts`. No new types introduced.
