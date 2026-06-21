# Skill-match badge on game cards

**Date:** 2026-06-20
**Status:** Approved design

## Problem

Skill-based fit is HoopFind's core differentiator, but the match label
(`getMatch()`) only renders on the game detail page. On the browse (`/games`)
and dashboard surfaces, players scan a grid of cards with no fit signal — they
have to open each game to learn whether it suits their skill level.

## Goal

Surface a compact fit badge on discovery cards, reusing the existing
`getMatch()` logic. No new matching algorithm, no ranking, no new dependencies.

## Scope

### Where the badge shows

- `/games` — every card
- `/dashboard` "Upcoming games" section — every card

### Where it does NOT show

- Dashboard "Joined games", "Hosted games", "Past hosted games" — the player is
  already in or owns these, so fit is noise.

This is enforced by making `match` an **optional** prop on `GameCard`. Cards
rendered without the prop show no badge.

## Behavior

The badge derives from the existing `MatchLabel` values:

| Match label                   | Badge text       | Tone      |
|-------------------------------|------------------|-----------|
| `Good Fit`                    | `Good Fit`       | `success` |
| `Might Be Too Competitive`    | `Too Competitive`| `warning` |
| `Might Be Too Casual`         | `Too Casual`     | `muted`   |
| `Missing Profile Info`        | — (render nothing)| —        |

Tone → class in `match-badge.tsx`: `success` → `border-success text-success`,
`warning` → `border-vermilion-ink text-vermilion-ink`, `muted` →
`border-ink text-muted` (the same palette `MatchLabel` already uses).

When the viewer is logged out or has no skill level set, `getMatch()` returns
`Missing Profile Info` and the badge renders nothing — discovery cards stay
quiet rather than nagging on every tile. The detail page still explains the
missing-profile case.

## Layout

Badge sits in the card's top row, between the game-type chip (left) and the
spots badge (right):

```
[3v3]        [GOOD FIT] [4 OPEN]
SATURDAY RUN
Sat, Jun 21 · 9:00 AM
Lincoln Park · North Side
"Full-court to 11..."
```

Styled as a compact bordered pill consistent with the existing editorial chips
(uppercase, bordered, small). Reuses the tone colors already defined for
`MatchLabel`.

## Components & changes

### 1. `lib/match.ts` — add `getMatchBadge`

Pure function holding the short-text mapping and the hide rule:

```ts
export type MatchTone = "success" | "warning" | "muted";

export interface MatchBadge {
  text: string;
  tone: MatchTone;
}

export function getMatchBadge(match: MatchResult): MatchBadge | null;
```

Returns `null` for `Missing Profile Info`; otherwise the short text + tone. This
is the only non-trivial new logic, so it gets a unit test (see Testing).

### 2. `components/match-badge.tsx` — new compact pill

- Props: `{ match: MatchResult }`
- Calls `getMatchBadge`; returns `null` when it returns `null`.
- Maps `tone` → Tailwind class (reusing the success / vermilion-ink / muted
  palette already used by `MatchLabel`).

### 3. `components/game-card.tsx`

- Add optional prop `match?: MatchResult`.
- When present, render `<MatchBadge match={match} />` in the top row, between
  the game-type chip and `SpotsBadge`.
- When absent, top row is unchanged.

### 4. `app/games/page.tsx`

- Fetch the viewer's profile in parallel with games:
  `Promise.all([fetchPublicGames(), getCurrentProfile()])`.
- For each game, compute `getMatch(profile, game)` and pass it as `match`.

### 5. `app/dashboard/page.tsx`

- Reuse the already-fetched `profile`.
- Pass `getMatch(profile, game)` as `match` to the "Upcoming games" cards only.
- Leave Joined / Hosted / Past cards with no `match` prop.

## Data / performance

- One extra query on `/games` (`getCurrentProfile`), run in parallel, auth
  claims already cached. Dashboard adds zero queries (profile already fetched).
- `getMatch` and `getMatchBadge` are pure and run per card — negligible.

## Testing

- Unit test for `getMatchBadge`: each of the four labels maps to the expected
  text/tone, and `Missing Profile Info` returns `null`.
- Manual check: logged-out browse shows no badges; logged-in player sees correct
  fit on `/games` and dashboard Upcoming, and no badge on Joined/Hosted/Past.

## Out of scope (add later if wanted)

- Sorting/ranking games by fit.
- Match badge on joined cards.
- Any change to the matching algorithm itself.
