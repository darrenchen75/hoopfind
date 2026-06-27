# Product Polish — Dashboard, Game Detail, Empty States, Mobile & A11y — Design

Date: 2026-06-27

## Goal

Make HoopFind feel finished and portfolio-ready by tightening the existing
screens — **no new features, no schema changes**. Focus areas:

1. Dashboard section organization (less clutter, clearer hierarchy).
2. Game detail page information hierarchy + state clarity.
3. Consistent, friendly empty states.
4. Mobile spacing and touch targets.
5. Accessibility (labels, focus, contrast, target size).

This is visual/product polish on the existing editorial system (paper / ink /
vermilion, Big Shoulders / Inter / Newsreader). Reuse `lib/ui.ts` and the
`@theme` tokens — do not introduce a new design language or a UI dependency.

## Guiding constraint

Every change must ride on the existing token + class system. The only new code
allowed is **small shared presentation helpers** (a `card` class string, an
`EmptyState` component, a `SectionHeading` component, a `btnSecondary` class) so
the polish reduces duplication instead of adding it. If a change needs a new npm
package, it is out of scope.

**This PR is presentation only. It must NOT change:**

- database schema or any Supabase migration,
- authentication or RLS,
- timezone logic,
- attendance logic,
- reliability / show-up-rate calculations,
- game-matching logic.

`lib/ui.ts` changes **are** allowed — it is the shared presentation-helper layer.
Other `lib/` data-layer files should be touched **only** if TypeScript requires a
small presentation-facing change (e.g. a render-only prop type); never to alter
queries, auth, or business logic.

---

## 1. Dashboard (`app/dashboard/page.tsx`)

### Current UX issues

- **Five visually identical full-width sections** stacked with `mt-12`
  (Discover/"Upcoming games", Joined, Hosted, Past hosted, Past games). Equal
  weight = no hierarchy and a long scroll. The user's own games and public
  discovery read as the same priority.
- **Discover is first.** A logged-in dashboard leads with public runs before
  "your games." Your joined/hosted games should lead.
- **"Upcoming games" is mislabeled** — it is the 3 recommended *public* games,
  not the user's upcoming games. Confusing next to "Joined" and "Past games."
- **Show-up rate is a buried one-liner** in the header (`showUpText`). It is the
  one earned, personal stat in the app and deserves to read as a stat.
- **Repeated inline boilerplate.** Every section re-implements the same
  error-panel / empty-paragraph / grid triad. Clutter in code and on screen.
- **Two separate past sections** ("Past hosted games" + "Past games"), one of
  which is conditionally hidden — inconsistent and noisy.

### Proposed improvements

- **Reorder, group by ownership:**
  1. Header + **profile/show-up summary** (see below).
  2. **Your upcoming games** — joined + hosted. Keep as two labeled sub-sections
     *or* merge under one "Your games" heading with hosted/joined chips. Default:
     keep two sub-sections but move them above Discover.
  3. **Discover** — rename "Upcoming games" → **"Discover public runs"** (the 3
     recommended games), with a "Browse all" link to `/games`.
  4. **History** — one lower-priority area, de-emphasized (smaller heading,
     rendered last). **MVP: keep the two existing data sets separate to avoid
     duplicate-card bugs and any data-layer change.** Under one heading
     ("History" or "Past games"), keep two small subsections:
     - Past games you joined/played (`pastJoinedGames`)
     - Past games you hosted (`pastHostedGames`)

     Only flatten into a single list if it can be done **safely in the page
     component** by deduping on `game.id` (a game you both hosted and were a
     participant in must appear once). If dedupe is not trivially safe in the
     component, ship the two subsections. **Do not change the Supabase queries
     or add new data-fetching logic for this** — reuse the existing
     `fetchCurrentUserPastJoinedGames` / `fetchCurrentUserPastHostedGames`
     results already loaded in the dashboard `Promise.all`.
- **Profile / show-up summary block** at the top: a single bordered `card`
  containing the show-up stat (`82% · 9/11 marked games`, or `New`) and, when the
  profile is incomplete, the existing completion prompt — merged into the same
  block instead of a separate full-width banner. Keeps the "do this next" and
  "here's your record" together and removes one stacked banner.
- **Extract the section pattern** into a tiny local helper (a `DashboardSection`
  wrapper or at minimum the shared `EmptyState` + `SectionHeader` below) so each
  block is heading + state + grid without repeated markup.

### Notes / open defaults

- Recommended-games count stays at 3 (`fetchPublicGames(3)`); no data change.
- Keep all existing data fetches and `Promise.all` shape; this is layout/markup
  reorganization only.

---

## 2. Game detail (`app/games/[id]/page.tsx`)

### Current UX issues

- **Match box outranks core facts.** Order is title → "Your match" card → join
  button → host controls → **then** the Players / Competitiveness / Type / Skill
  `dl`. The key facts a player decides on (spots left, skill range) sit below the
  fold under the match card.
- **`gameType` is shown twice** — the badge next to the title and again in the
  facts `dl`. Redundant.
- **Notes always render**, even when empty: an empty string still paints a
  "Notes" heading with a blank body.
- **No explicit "started / in progress" state.** When `hasStarted` is true the
  join button disables and host edit/cancel disappear, but nothing on the page
  says *why*. Reads as broken rather than intentional.
- **Single `max-w-3xl` column** makes for a long scroll; the four facts + roster
  + attendance could use the horizontal space better on wide screens.

### Proposed improvements

- **Promote the facts.** Move the Players / Skill / Competitiveness summary
  directly under the date/location line (a compact inline meta row or the `dl`),
  above the match card and join action. Decision info first, "is it a fit"
  second, action third.
- **Single source for game type** — keep the title-row badge, drop the duplicate
  `dl` entry (or vice-versa; pick one).
- **Hide the Notes block when `game.notes` is empty.**
- **Add a clear status line** for the two non-default states, styled like the
  existing canceled banner:
  - Canceled → existing "Canceled by the host" banner (keep).
  - Started/in the past → a neutral "This game has already started" banner so the
    disabled join + missing host controls read as intentional.
- **State-driven action order** stays: canceled hides join + host controls;
  started hides host edit/cancel; otherwise show join, then (if creator) host
  controls.
- Optional, low-priority: a two-column layout at `lg` (facts/roster left,
  attendance right) — only if it stays within the current tokens and adds no
  complexity. Single column is acceptable to ship.

---

## 3. Empty states

### Current UX issues

Empty states exist but are **inconsistent plain paragraphs**:

- Dashboard uses `border-2 border-ink bg-paper p-6 text-muted` ad hoc in each
  section; some have a CTA link (Joined, Hosted), some don't (Past games: bare
  "No past games yet.").
- "No hosted games (past)" has no empty state at all — the whole section is
  hidden, so the user can't tell the difference between "none" and "broken."
- Roster/attendance empties use `note` from `lib/ui.ts` — already consistent,
  good. The dashboard should match that level of consistency.

### Proposed improvements

Introduce one shared **`EmptyState`** component (props: `message`, optional
`cta: { href, label }`) rendered with a consistent class (extend `note` or add an
`emptyCard` class to `lib/ui.ts`). Apply to every dashboard list. Copy:

- **No joined games:** "You haven't joined any games yet." → CTA "Browse public
  runs" → `/games`.
- **No hosted games:** "You haven't created a game yet." → CTA "Create a game" →
  `/games/new`. (Render the empty state instead of hiding the section.)
- **No past games:** "No past games yet — they'll show up here after you play."
  (no CTA).
- **No public games (Discover & `/games`):** "No public games yet. Be the first
  to post a run." → CTA "Create a game".
- **Incomplete profile:** keep as the summary-block prompt (section 1), wording
  unchanged: "Complete your player profile to improve game matching."
- **Roster — logged out / not joined / error:** keep existing `GameRoster`
  messages; they already use the shared `note` style. No change needed beyond
  confirming the wording matches the new empty-state voice.

Consistency is the deliverable here, not new copy mechanics.

---

## 4. Mobile polish

### Current UX issues

- **Touch targets below ~44px:**
  - Attendance buttons (`host-attendance-manager.tsx`): `px-4 py-1.5 text-sm` →
    ~30px tall.
  - Form inputs (`lib/ui.ts` `field`): `px-3 py-2 text-sm` → ~36px tall.
  - Secondary actions are bare text links ("Cancel and go back", "Keep game",
    "Browse public runs") — small inline tap targets.
- **Card grids** are fine (`sm:grid-cols-2 lg:grid-cols-3`); single column on
  mobile already works.
- **Game detail** `dl` already stacks (`sm:grid-cols-2`); fine.

### Proposed improvements

- **Bump interactive min-heights to 44px on touch.** Add `min-h-11` (44px) to
  `field` and to the attendance buttons; the primary button (`py-3`) already
  clears it.
- **Attendance buttons:** keep side-by-side but ensure each is ≥44px tall and
  comfortably wide; on the narrowest screens allow them to stretch
  (`flex-1 sm:flex-none`) so they are easy to hit.
- **Roster rows / attendance rows:** already `border-2 p-4` stacked; verify the
  right-aligned show-up block doesn't crowd long names on small screens (it uses
  `shrink-0` + `gap-3` — keep, confirm wrap behavior).
- **Form spacing:** `gap-6` between fields is good; no change needed beyond the
  input height bump. Confirm `date`/`time`/`number` native controls render at the
  new min-height.
- **Detail title row:** `flex items-start justify-between` with a `shrink-0`
  badge can get tight with long titles on mobile — allow the title to wrap and
  the badge to drop below on `xs` if needed.

---

## 5. Accessibility polish

### Current UX issues

- **Attendance buttons lack context for screen readers.** Each row has two
  buttons reading only "Attended" / "Missed" with no tie to the player name, and
  no pressed/selected semantics — only color distinguishes the active state.
- **Color-only state.** Active attendance status and spots-left urgency are
  conveyed by color alone in places.
- **Small/low-contrast text.** `text-[10px]` show-up label and several
  `text-xs uppercase` rows on `text-muted` (#6B6256) push small-text contrast.
- Focus states are mostly **good already** — `btnPrimary`, `field`, `GameCard`,
  and the attendance `baseBtn` all have `focus-visible` outlines. Preserve them.

### Proposed improvements

- **Attendance buttons:** add
  `aria-label="Mark {displayName} as attended/missed"` and `aria-pressed={status
  === 'attended'}` (and the missed equivalent) so the control is self-describing
  and state is exposed non-visually.
- **Don't rely on color alone:** the active attendance button already shows a
  border + tint; `aria-pressed` covers AT. For spots-left, the text ("3 left",
  "Full") already carries meaning alongside color — keep the text.
- **Contrast / size:** bump the `text-[10px]` roster label to at least `text-xs`;
  spot-check `text-muted` small text against paper for WCAG AA (the rollout spec
  notes `muted` is secondary text — keep it off the smallest sizes). Don't drop
  below `text-xs` for any meaningful text.
- **Targets:** the 44px bump in section 4 is the a11y target-size win; apply it
  to all real buttons (attendance, fields). Consider promoting the most-used
  text-link actions to a real `btnSecondary` (see below) for a larger hit area.
- **Progress bar** in `GameCard` is `aria-hidden` with the "x/y" count as the
  text equivalent — correct, keep.

---

## Shared primitives to add (keeps polish DRY)

Add to `lib/ui.ts` (single source, mirrors how `btnPrimary`/`field` already
work):

- `card` — the repeated `border-2 border-ink bg-paper p-5` panel.
- `btnSecondary` — a real secondary button (outline/ghost) to replace bare text
  links where a tappable target matters (form cancel, "Keep game"). Keep text
  links only for truly tertiary navigation.
- `emptyCard` (or reuse/extend `note`) — the empty-state panel class.

Add two **tiny** components — and nothing more:

- `components/empty-state.tsx` — `{ message, cta? }` → consistent empty block.
- `components/section-heading.tsx` — heading + optional subtext + optional
  trailing link ("Browse all"), to replace the repeated dashboard `h2 + p`.

Keep both deliberately small and dumb: a few props, no internal state, no
variants system. **No generic component library, no complex abstraction, no
config-driven rendering.** If wrapping markup in one of these components makes a
call site *harder* to read than inline markup, prefer the inline markup. These
are the only new files. No new dependencies.

---

## Files likely to change

UI / markup only — **no `lib/` data layer, no `supabase/` migration:**

- `app/dashboard/page.tsx` — reorder sections, summary block, shared empties.
- `app/games/[id]/page.tsx` — facts hierarchy, dedupe game type, hide empty
  notes, started-state banner.
- `app/games/page.tsx` — swap the inline empty paragraph for `EmptyState`.
- `components/game-card.tsx` — minor: `text-[10px]`/contrast nits if any; spots
  badge already textful.
- `components/game-roster.tsx` — bump tiny label size; reuse `EmptyState`/`note`.
- `components/host-attendance-manager.tsx` — `aria-label` + `aria-pressed`,
  44px targets, `flex-1` on narrow screens.
- `components/game-form.tsx` — input min-height via `field`; `btnSecondary` for
  cancel.
- `components/cancel-game-button.tsx` — `btnSecondary` for "Keep game".
- `lib/ui.ts` — add `card`, `btnSecondary`, `emptyCard`.
- `components/empty-state.tsx` (new), `components/section-heading.tsx` (new).

---

## Implementation phases

1. **Primitives.** `lib/ui.ts` additions (`card`, `btnSecondary`, `emptyCard`) +
   `EmptyState` and `SectionHeading` components. Nothing visual yet beyond the
   two components existing.
2. **Dashboard.** Reorder sections, add the summary block, replace inline
   empties with `EmptyState`, and group the two past data sets under one
   de-emphasized History heading (keep them as separate subsections; flatten
   into one list only if deduping on `game.id` is trivially safe in the page).
   Highest visual impact.
3. **Game detail.** Promote facts, dedupe game type, hide empty notes, add the
   started-state banner.
4. **Mobile + targets.** 44px min-heights on `field` and attendance buttons,
   `btnSecondary` swaps, narrow-screen button stretch.
5. **A11y pass.** Attendance `aria-label`/`aria-pressed`, small-text size/contrast
   fixes, confirm focus-visible preserved everywhere.

Phases 2–5 are independent and shippable on their own once phase 1 lands.

---

## Manual QA checklist

No automated suite. After each phase: `npm run lint` + `npm run build` clean,
then:

- [ ] **Dashboard order:** your joined + hosted games appear above Discover;
      past games render last and de-emphasized.
- [ ] **Summary block:** show-up stat reads correctly (`%` / `New`); incomplete
      profile prompt appears inside it and links to `/profile/setup`.
- [ ] **Dashboard empties:** brand-new account shows consistent EmptyState cards
      (no joined / no hosted with CTAs, no past games without CTA).
- [ ] **Discover empty/error:** with no public games, shows the EmptyState; on a
      forced fetch error, shows the error panel (not raw Supabase text).
- [ ] **Detail hierarchy:** Players / Skill / Competitiveness appear above the
      match card and join button; game type shown once.
- [ ] **Empty notes:** a game with no notes shows no Notes heading.
- [ ] **Started game:** open a past/started game — disabled join + a neutral
      "already started" banner; no host edit/cancel.
- [ ] **Canceled game:** canceled banner shows; join + host controls hidden.
- [ ] **Roster access:** logged-out and logged-in non-member still cannot load
      the roster; messages match the empty-state voice.
- [ ] **Touch targets:** form inputs and attendance buttons ≥44px tall on mobile
      viewport; secondary buttons tappable.
- [ ] **Attendance buttons expose action + state:** each row has
      `aria-label="Mark {displayName} as attended"` and
      `aria-label="Mark {displayName} as missed"`, and `aria-pressed` reflects
      the current status (`true` on the active one). Verify with a screen reader.
- [ ] **Focus visible** on every interactive element (cards, buttons, fields,
      links) via keyboard.
- [ ] **Contrast:** no meaningful text below `text-xs`; muted small text passes
      AA against paper.
- [ ] **~360px width:** view the dashboard and game detail page at ~360px —
      no horizontal scrolling, long game titles wrap, and badges/buttons do not
      squeeze or overflow the layout. Also confirm forms at 360px.

---

## Out of scope

- Any database migration or schema change.
- New product flows: messaging, maps, notifications, payments, AI matchmaking,
  filters beyond what exists, full attendance-history pages.
- A from-scratch redesign or a new design language — this reuses the editorial
  tokens and `lib/ui.ts`.
- Any new npm/UI dependency (component lib, icon pack, animation lib).
- Changes to database schema/migrations, authentication, RLS, data fetching /
  Supabase queries, timezone logic, attendance logic, reliability / show-up-rate
  calculations, or game-matching (`getMatch`) logic — markup and class changes
  only. Data-layer files change only when TypeScript forces a render-only tweak.
- Copy rewrites beyond the empty-state/state-banner wording named above.
