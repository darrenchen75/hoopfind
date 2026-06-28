# Error Handling Cleanup — Design

Date: 2026-06-27

## Goal

Make HoopFind's error handling consistent and safe:

1. **Sanitize client errors** — stop leaking raw Supabase/Postgres `error.message`
   strings into the UI; show curated, user-safe messages instead.
2. **Distinguish validation from system errors** — keep specific, actionable
   messages for user-input validation; genericize unknown system/DB errors.
3. **Add server-side logging** — the data layer currently swallows errors
   silently; log them so failures are debuggable.

No new product behavior. No database or auth-flow changes.

## Current state

**Data layer** (`lib/games.ts`, `lib/participation.ts`, `lib/roster.ts`):
consistent shape — on a Supabase error, `return { games: [], error: true }`.
But the underlying error is **discarded with no log**, so failures are invisible
server-side.

**Client components — two patterns:**

- **Leaky:** raw `error.message` shown directly to the user in
  `auth-form.tsx` (login + signup), `profile-form.tsx`, `game-form.tsx`
  (insert + update), `cancel-game-button.tsx`, `game-participation-button.tsx`.
  These dump raw Supabase/Postgres text (e.g. constraint-violation strings) at
  the user.
- **Sanitized (the model to generalize):** `host-attendance-manager.tsx` keeps a
  local `SAFE_ERRORS` allowlist + `attendanceErrorMessage()` that shows known
  messages and falls back to a generic line.

**Most known-safe messages already exist, but not all DB strings are safe to
show.** The RPC functions raise human-readable strings (migrations `004`, `006`,
`007`, `009`), and they arrive verbatim in `error.message`. But some are
access/privacy-sensitive or simply not useful in the UI — e.g. `Game not found`,
`This game is not public`, `Only the game creator can view attendance details`,
`Only the game creator can update attendance`, `Participant not found for this
game`. Those must **not** be surfaced; they fall back to an action-specific
generic message. "Sanitizing" therefore means: **show a conservative allowlist
of safe strings as-is; replace everything else with a generic message.**

## Design

### 1. `lib/errors.ts` (new) — small, no framework

Three small allowlists scoped by action, plus one helper. Be conservative:
if unsure whether a message is safe to show, leave it out — it falls back to the
generic message.

```ts
export const GENERIC_ERROR = "Something went wrong. Please try again.";

// Default set: curated Supabase auth strings, safe + user-actionable.
export const COMMON_SAFE_MESSAGES: ReadonlySet<string> = new Set([
  "Invalid login credentials",
  "Email not confirmed",
]);

// join_game / leave_game RPC (migrations 004, 007). Excludes access/privacy
// strings ("Game not found", "This game is not public").
export const PARTICIPATION_SAFE_MESSAGES: ReadonlySet<string> = new Set([
  "Authentication required",
  "This game has already started",
  "You have already joined this game",
  "This game is full",
  "You can no longer leave after the game has started",
  "You do not have an active joined reservation for this game",
  "This game has been canceled",
]);

// set_participant_attendance RPC (migration 006). Excludes "Only the game
// creator can update attendance" and "Participant not found for this game".
export const ATTENDANCE_SAFE_MESSAGES: ReadonlySet<string> = new Set([
  "Attendance status must be attended or missed",
  "Attendance cannot be updated before the game starts",
]);

export function toSafeMessage(
  error: { message?: string } | null | undefined,
  fallback = GENERIC_ERROR,
  safeMessages: ReadonlySet<string> = COMMON_SAFE_MESSAGES,
): string {
  return error?.message && safeMessages.has(error.message)
    ? error.message
    : fallback;
}
```

- **Exact-match** against a curated set — identical logic to the existing
  `SAFE_ERRORS`, generalized. Unknown messages (raw Postgres from direct table
  writes, network failures, unexpected auth internals) never reach the user.
- **Three params, no more.** `fallback` lets callers give an action-specific
  generic; `safeMessages` lets a caller opt into a scoped set (defaulting to
  `COMMON_SAFE_MESSAGES`). This is the whole "framework" — do not add error
  classes, registries, or a global mega-set.
- Each set mirrors the corresponding DB `RAISE` strings byte-for-byte (it is a
  read-only mirror of the DB contract, not a new contract). Privacy/access
  strings are deliberately omitted.

### 2. Client components — wrap system errors

Replace every raw `setError(error.message)` (system/Supabase error) with
`setError(toSafeMessage(error, <fallback>, <set>))`:

| File | Safe set | Fallback | Notes |
|------|----------|----------|-------|
| `components/game-participation-button.tsx` | `PARTICIPATION_SAFE_MESSAGES` | action-aware: join → "We couldn't join this game. Please try again.", leave → "We couldn't leave this game. Please try again." | `run()` already knows the action; pick the fallback from it. |
| `components/host-attendance-manager.tsx` | `ATTENDANCE_SAFE_MESSAGES` | "We couldn't update attendance. Refresh and try again." (its existing fallback) | **Delete** local `SAFE_ERRORS` + `attendanceErrorMessage`; becomes a consumer of the shared helper. |
| `components/game-form.tsx` | (default `COMMON`) | "We couldn't save the game. Please try again." | insert + update. **Leave `validate()` output untouched** (see rule below). |
| `components/profile-form.tsx` | (default `COMMON`) | "We couldn't save your profile. Please try again." | **Leave any local `validate()` output untouched.** |
| `components/cancel-game-button.tsx` | (default `COMMON`) | "We couldn't cancel the game. Please try again." | direct table update. |
| `components/auth-form.tsx` | `COMMON_SAFE_MESSAGES` (default) | `GENERIC_ERROR` | login + signup: wrap the auth `error.message`. **Keep** the existing `identities.length === 0` "account already exists" branch — it's a data check, not an `error.message`. |

For `game-form`, `profile-form`, and `cancel-game-button` the action's own
errors are raw table-write failures (no user-safe RAISE strings), so they don't
need a scoped allowlist — passing only `error` + a fallback (default `COMMON`
set, which won't match table-write errors) genericizes them, which is the intent.

Optionally, each component may `console.error(error)` before showing the safe
message so the raw error stays visible in devtools. Recommended, not required.

### 3. Validation vs system — explicit rule

- **Validation errors** come from local `validate()` helpers (game-form,
  profile-form) and describe the user's own input (e.g. "Max players must be at
  least 2"). They are **safe and shown directly — never passed through
  `toSafeMessage`.**
- **System errors** are anything returned/thrown by Supabase (table writes,
  RPC, auth). These **always** go through `toSafeMessage`.

This rule prevents a future change from genericizing useful validation text.

### 4. Server-side logging — data layer

In `lib/games.ts`, `lib/participation.ts`, `lib/roster.ts`, log before
returning the error flag:

```ts
if (error) {
  console.error("fetchPublicGames", error);
  return { games: [], error: true };
}
```

- Use the function name as the log label so the source is obvious.
- `console.error` only — **no external logging service** (no Sentry).
- Applies to every existing `error` branch that currently returns the boolean
  flag silently. **Do not change the returned data shapes** — pages still read
  the boolean and render their existing copy.

## Testing

The repo uses **Vitest** (see existing `lib/match.test.ts`, `lib/reliability.test.ts`).

### `lib/errors.test.ts` (new)

Mirror the existing test style (`import { describe, it, expect } from "vitest"`).
Cover `toSafeMessage`:

- **Allowlisted safe message returns as-is:**
  `toSafeMessage({ message: "This game is full" }, GENERIC_ERROR, PARTICIPATION_SAFE_MESSAGES)`
  → `"This game is full"`.
- **Default set (COMMON) match:**
  `toSafeMessage({ message: "Invalid login credentials" })` → `"Invalid login credentials"`.
- **Unknown raw DB/Postgres/Supabase message returns fallback:**
  `toSafeMessage({ message: 'duplicate key value violates unique constraint "games_pkey"' }, GENERIC_ERROR, PARTICIPATION_SAFE_MESSAGES)`
  → `GENERIC_ERROR`.
- **Null / undefined error returns fallback:** `toSafeMessage(null)` → `GENERIC_ERROR`;
  `toSafeMessage(undefined)` → `GENERIC_ERROR`; `toSafeMessage({ message: undefined })` → `GENERIC_ERROR`.
- **Custom fallback works:** `toSafeMessage(null, "Custom fallback")` → `"Custom fallback"`.
- **Set scoping is respected:** a message in one set is genericized under a
  different set — `toSafeMessage({ message: "This game is full" }, GENERIC_ERROR, ATTENDANCE_SAFE_MESSAGES)`
  → `GENERIC_ERROR`.

### Required checks (all must pass)

- `npm run test` (or the project's Vitest command) — `lib/errors.test.ts` green.
- `npm run lint` clean.
- `npm run build` clean.
- Manual QA (below).

## Manual QA

In `npm run dev`:

- [ ] **Known RPC error shows verbatim:** join a full game → "This game is
      full."; try to leave after start → "You can no longer leave after the game
      has started."
- [ ] **Privacy/access strings genericized:** trigger a path that raises an
      access string (e.g. a non-creator hitting an attendance/creator-only
      action) → an action-specific generic, **not** "Only the game creator…" or
      "Participant not found…".
- [ ] **Attendance still works:** the attendance manager shows its known messages
      and its action-specific generic fallback (no behavior change vs today).
- [ ] **Raw error genericized:** force a direct-table-write failure (e.g. a
      game-form insert that violates a constraint / RLS) → "We couldn't save the
      game. Please try again." (no raw Postgres text).
- [ ] **Login feedback preserved:** wrong password → "Invalid login
      credentials"; unknown system auth error → generic.
- [ ] **Signup "account exists":** existing email → "An account with this email
      already exists. Try logging in." (unchanged).
- [ ] **Validation untouched:** submit game-form with bad input → the specific
      validation message still shows (not genericized).
- [ ] **Server logs:** a forced data-layer failure prints `console.error` with
      the function name in the server console; the page still renders its
      existing "We couldn't load…" copy.

## Out of scope

- Database schema changes.
- Migrations.
- RLS changes.
- RPC changes (the raised `RAISE` strings are the contract; the safe sets mirror
  a conservative subset of them).
- A toast / notification system.
- New dependency.
- UI redesign / new error panels — reuse `errorPanel` / `note` from `lib/ui.ts`.
- Auth-flow logic (redirects, session handling, the identities-based signup
  check) — only the error *message* shown changes.
- External logging / monitoring (Sentry, etc.).
- Deduping the per-page "We couldn't load X…" copy strings (deferred).
- Changing the data layer's `{ ..., error: boolean }` return shape.

## Files likely to change

New:
- `lib/errors.ts` — `GENERIC_ERROR`, `COMMON_SAFE_MESSAGES`,
  `PARTICIPATION_SAFE_MESSAGES`, `ATTENDANCE_SAFE_MESSAGES`, `toSafeMessage`.
- `lib/errors.test.ts` — Vitest unit tests for `toSafeMessage`.

Modified — client (sanitize):
- `components/game-participation-button.tsx` (participation set + join/leave fallback)
- `components/host-attendance-manager.tsx` (attendance set; removes local allowlist)
- `components/game-form.tsx`
- `components/profile-form.tsx`
- `components/cancel-game-button.tsx`
- `components/auth-form.tsx`

Modified — data layer (logging):
- `lib/games.ts`
- `lib/participation.ts`
- `lib/roster.ts`

## Notes / decisions

- **Conservative by default.** Access/privacy strings (`Game not found`,
  `This game is not public`, `Only the game creator…`, `Participant not found…`)
  are intentionally excluded from every set and fall back to generic. When in
  doubt, leave a message out.
- **Exact-match, not substring.** Matches the proven `host-attendance-manager`
  behavior and avoids accidentally surfacing a raw message that merely contains
  a safe phrase. If Supabase ever prefixes RPC messages, the affected strings
  fall to the generic fallback (safe) and the set can be adjusted.
- **Auth provider drift.** "Invalid login credentials" / "Email not confirmed"
  are Supabase's strings, not ours. If the provider rewords them, login errors
  fall back to generic — acceptable, since generic is still safe and the set is
  trivial to update.
