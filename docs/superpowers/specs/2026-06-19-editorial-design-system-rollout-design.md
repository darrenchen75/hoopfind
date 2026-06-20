# Editorial Design System Rollout

**Date:** 2026-06-19
**Status:** Approved (design), pending implementation plan

## Goal

Apply the editorial visual system introduced on the landing page (`/`) to every
other frontend page so the whole app shares one look. Today the landing is light
editorial (paper/ink/vermilion, Big Shoulders / Inter / Newsreader) while all app
pages are dark zinc + orange. After this work, the app is consistently editorial.

No behavior changes: forms, auth, Supabase calls, routing, and roster/attendance
logic stay exactly as they are. This is a restyle plus a shared token layer.

## Scope

**In scope — restyle all 7 app pages:**

- `/dashboard`
- `/games`
- `/games/[id]`
- `/games/new`
- `/login`
- `/signup`
- `/profile/setup`

Plus the shared components they render and the token/layout layer.

**Out of scope:** copy rewrites beyond what a restyle requires, new features,
backend/auth/schema changes, the temporary concept pages (already deleted).

## Architecture: shared token system (approved approach A)

The app already centralizes through `SiteHeader`, `GameCard`, and the form
components, so consistency lives in a shared layer rather than per-page classes.

### 1. Token layer (single source of truth)

**Fonts — `app/layout.tsx`:** replace Geist with the editorial faces via
`next/font/google`, exposing CSS variables on `<html>`:

- Big Shoulders → `--ff-display`
- Inter → `--ff-body`
- Newsreader (normal + italic) → `--ff-serif`

Inter becomes the app-wide base font.

**Colors — `app/globals.css` `@theme`:** register the palette as real Tailwind
utilities (so pages use `bg-paper`, `text-ink`, `border-line`, etc. — not
arbitrary `bg-[var(--c-…)]`):

| Token | Hex | Use |
|-------|-----|-----|
| `paper` | `#EFEAE2` | page background |
| `ink` | `#16130F` | primary text, borders, dark fills |
| `vermilion` | `#FF3B1D` | accent fills, large display accent |
| `vermilion-ink` | `#C41E0E` | small accent text/links on paper (AA), errors |
| `muted` | `#6B6256` | secondary text |
| `line` | `#D8D0C2` | hairline dividers |
| `success` | `#3C6B47` | positive status (Good Fit, signup success) |

Also map font families in `@theme`: `--font-sans: var(--ff-body)`,
`--font-display: var(--ff-display)`, `--font-serif: var(--ff-serif)` → utilities
`font-sans` (default), `font-display`, `font-serif`.

Remove the `prefers-color-scheme: dark` block and the `font-family: Arial` body
rule from `globals.css`. The app is **light editorial only**; dark mode is dropped.

### 2. Feedback colors

The editorial palette has no green/neutral for status, so two tokens are added
(`success`, and `vermilion-ink` reused for errors). Mapping:

- **`MatchLabel`** (`components/match-label.tsx`):
  - Good Fit → `success`
  - Might Be Too Competitive → `vermilion`
  - Might Be Too Casual → `muted`/neutral
  - Missing Profile Info → `muted`
- **Auth/error panels** (auth-form, dashboard load errors, etc.) → `vermilion-ink`
  on a soft tint.
- **Signup success message** → `success` on a soft tint.

All feedback colors must meet WCAG AA as used (text vs background). `success`
`#3C6B47` on paper ≈ 6:1; `vermilion-ink` on paper ≈ 5:1.

### 3. Shared components (restyled once)

- **`SiteHeader`** → editorial sticky nav: Big Shoulders wordmark, `border-b-2`
  ink, paper background, solid vermilion "Find a game" / primary action. Mirrors
  the landing nav so the header is identical across landing and app.
- **`AuthNav`** + **`LogoutButton`** → restyled to the editorial nav (logged-in:
  Dashboard / Profile / Log out; logged-out: Log in / Sign up).
- **`GameCard`** → square `border-2` ink card on paper, Big Shoulders title,
  game type, skill range, competitiveness, player count, notes. No per-user fit
  badge on the card (fit depends on the viewer's profile and stays on the detail
  page via `getMatch`).
- **`MatchLabel`** → editorial badges using the feedback tokens above.
- **`lib/ui.ts`** (the only new abstraction) → shared class strings consumed by
  the three forms and buttons: `btnPrimary`, `btnSecondary`, `field`, `label`.
  Keeps form fields and buttons consistent without per-file drift.

The roster/attendance components (`game-roster`, `attendance-list`,
`host-attendance-manager`, `game-participation-button`) get class-level restyling
to the editorial tokens; their logic and props are untouched.

### 4. Page shells

Each page's `<main>`/`<section>` frame moves from `bg-zinc-950 text-white` to the
editorial `bg-paper text-ink` frame, with headings in Big Shoulders, eyebrows in
`vermilion-ink`, and section dividers in `line`. Markup structure and all
data-fetching / server-component logic are unchanged — class swaps and wrapper
tweaks only. Applies to all 7 pages listed in Scope.

### 5. Landing dedupe

Refactor `app/page.tsx` to consume the shared tokens: drop its inline `palette`
object, its module-scope `next/font` imports, and its `bg-[var(--c-…)]` arbitrary
classes in favor of the `@theme` utilities (`bg-paper`, `text-ink`,
`font-display`, etc.) and the layout-provided fonts. Visual result is identical;
the duplication is removed. The landing's `lib/landing-content.ts` sample data is
unchanged.

## Components and their boundaries

| Unit | Purpose | Depends on |
|------|---------|-----------|
| `globals.css` `@theme` | defines color + font tokens as utilities | next/font vars from layout |
| `app/layout.tsx` | loads fonts, sets base font/background | globals |
| `lib/ui.ts` | shared button/field/label class strings | tokens |
| `SiteHeader` / `AuthNav` / `LogoutButton` | app-wide nav | tokens, auth state |
| `GameCard` / `MatchLabel` | game presentation | tokens, types |
| forms (auth/profile/create-game) | data entry | `lib/ui.ts`, tokens, Supabase |
| page shells (×7) | layout + content | SiteHeader, GameCard, tokens |

Each unit can be understood and changed independently: tokens change look without
touching markup; a page shell changes layout without touching tokens or logic.

## Error handling

No new error paths. Existing error/empty/loading states (dashboard load failures,
auth errors, roster access errors, empty lists) keep their current logic and are
restyled to the feedback tokens (`vermilion-ink` for errors, `muted` for empty
states, `success` for positive confirmations).

## Testing / verification

The project has no automated test suite. Verification per the existing workflow:

- `npm run lint` clean
- `npm run build` (includes TypeScript) clean
- Manual: load all 7 routes plus `/` in `npm run dev`, confirm:
  - consistent editorial look, no leftover zinc/orange
  - forms still submit (login, signup, create game, profile setup)
  - keyboard focus visible on all interactive elements
  - AA contrast on text/feedback colors
  - no horizontal scroll, mobile layout intact

## Risks

- **Shared components touch many pages.** Mitigation: restyle is class-only;
  preserve every prop, handler, and conditional. Build + manual pass after each
  component.
- **Token migration could miss a hardcoded color.** Mitigation: grep for `zinc`,
  `orange`, `emerald`, `red-`, `green-`, `sky-` across `app/` and `components/`
  after the rollout; none should remain except intentional feedback tokens.

## Implementation order (for the plan)

1. Token layer: fonts in layout, `@theme` colors in globals, drop dark mode.
2. `lib/ui.ts` shared class strings.
3. Shared components: `SiteHeader`/`AuthNav`/`LogoutButton`, `GameCard`,
   `MatchLabel`, forms, roster/attendance.
4. Page shells (×7).
5. Landing dedupe to shared tokens.
6. Cleanup grep + final lint/build/manual verification.
