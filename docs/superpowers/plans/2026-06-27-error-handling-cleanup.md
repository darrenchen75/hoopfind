# Error Handling Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop leaking raw Supabase/Postgres error strings to users, distinguish validation from system errors, and log swallowed data-layer errors.

**Architecture:** One small new module `lib/errors.ts` holds three conservative safe-message allowlists + a `toSafeMessage` helper. Client components route system errors through it (with action-specific fallbacks); the data layer adds `console.error` before its existing silent error returns. No data-shape, schema, or auth-flow changes.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, Supabase. Tests: Vitest (`npm run test`), colocated `lib/*.test.ts`. Spec: `docs/superpowers/specs/2026-06-27-error-handling-cleanup-design.md`.

## Global Constraints

Copied from the spec — every task is bound by these:

- **No** database schema changes, migrations, RLS changes, or RPC changes. The DB `RAISE` strings are the contract; the safe sets mirror a **conservative subset**.
- **No** toast/notification system, **no** new dependency, **no** UI redesign or new error panels — reuse `errorPanel` / `note` from `lib/ui.ts`.
- **No** external logging service (Sentry, etc.). Server logging is `console.error` only.
- **Do not** change the data layer's `{ ..., error: boolean }` (or `| null`) return shapes.
- **Validation** strings from local `validate()` helpers are shown **directly — never** passed through `toSafeMessage`. Only Supabase/RPC/auth errors get wrapped.
- **Allowlists are exact-match and conservative.** Privacy/access strings (`Game not found`, `This game is not public`, `Only the game creator…`, `Participant not found for this game`) are excluded from every set and fall back to generic.
- `toSafeMessage` is capped at **three params** (`error`, `fallback`, `safeMessages`). No error classes, registries, or a global mega-set.
- **Commit messages:** lowercase imperative, short. **Never** a `Co-Authored-By` / AI-credit line.
- **Verification gate per task:** `npm run test` (Vitest) green, `npm run lint` clean, `npm run build` clean. Plus the manual check named in the task.
- Work on branch `feature/error-handling` (already cut from `origin/main`; the spec is committed there). Stage only the files each task names — unrelated untracked files (`.claude/`, `CLAUDE.md`) must stay out of commits.

---

## File Structure

| File | Responsibility | New? |
|------|----------------|------|
| `lib/errors.ts` | `GENERIC_ERROR`, three `*_SAFE_MESSAGES` sets, `toSafeMessage(error, fallback?, safeMessages?)` | create |
| `lib/errors.test.ts` | Vitest unit tests for `toSafeMessage` | create |
| `components/game-participation-button.tsx` | join/leave: participation set + action fallback | modify |
| `components/host-attendance-manager.tsx` | attendance set; delete local allowlist | modify |
| `components/game-form.tsx` | wrap insert/update errors; keep `validate()` direct | modify |
| `components/profile-form.tsx` | wrap upsert error | modify |
| `components/cancel-game-button.tsx` | wrap update error | modify |
| `components/auth-form.tsx` | wrap login/signup error (COMMON set); keep identities branch | modify |
| `lib/games.ts` / `lib/participation.ts` / `lib/roster.ts` | `console.error` before each `error: true` return | modify |

---

## Task 1: `lib/errors.ts` + tests (TDD)

**Files:**
- Create: `lib/errors.ts`
- Test: `lib/errors.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `GENERIC_ERROR: string`
  - `COMMON_SAFE_MESSAGES: ReadonlySet<string>`
  - `PARTICIPATION_SAFE_MESSAGES: ReadonlySet<string>`
  - `ATTENDANCE_SAFE_MESSAGES: ReadonlySet<string>`
  - `toSafeMessage(error: { message?: string } | null | undefined, fallback?: string, safeMessages?: ReadonlySet<string>): string`

- [ ] **Step 1: Write the failing test**

Create `lib/errors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  toSafeMessage,
  GENERIC_ERROR,
  COMMON_SAFE_MESSAGES,
  PARTICIPATION_SAFE_MESSAGES,
  ATTENDANCE_SAFE_MESSAGES,
} from "./errors";

describe("toSafeMessage", () => {
  it("returns an allowlisted message as-is", () => {
    expect(
      toSafeMessage({ message: "This game is full" }, GENERIC_ERROR, PARTICIPATION_SAFE_MESSAGES),
    ).toBe("This game is full");
  });

  it("matches against the default COMMON set", () => {
    expect(toSafeMessage({ message: "Invalid login credentials" })).toBe(
      "Invalid login credentials",
    );
  });

  it("returns the fallback for an unknown raw error", () => {
    expect(
      toSafeMessage(
        { message: 'duplicate key value violates unique constraint "games_pkey"' },
        GENERIC_ERROR,
        PARTICIPATION_SAFE_MESSAGES,
      ),
    ).toBe(GENERIC_ERROR);
  });

  it("returns the fallback for null, undefined, or message-less error", () => {
    expect(toSafeMessage(null)).toBe(GENERIC_ERROR);
    expect(toSafeMessage(undefined)).toBe(GENERIC_ERROR);
    expect(toSafeMessage({ message: undefined })).toBe(GENERIC_ERROR);
  });

  it("uses a custom fallback", () => {
    expect(toSafeMessage(null, "Custom fallback")).toBe("Custom fallback");
  });

  it("genericizes a message that belongs to a different set", () => {
    expect(
      toSafeMessage({ message: "This game is full" }, GENERIC_ERROR, ATTENDANCE_SAFE_MESSAGES),
    ).toBe(GENERIC_ERROR);
  });

  it("excludes privacy/access strings from the sets", () => {
    expect(COMMON_SAFE_MESSAGES.has("Email not confirmed")).toBe(true);
    expect(PARTICIPATION_SAFE_MESSAGES.has("Game not found")).toBe(false);
    expect(ATTENDANCE_SAFE_MESSAGES.has("Only the game creator can update attendance")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test`
Expected: FAIL — `lib/errors.test.ts` cannot resolve `./errors` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/errors.ts`:

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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test`
Expected: PASS — all `toSafeMessage` cases green. Output pristine.

- [ ] **Step 5: Lint + build**

Run: `npm run lint` → clean.
Run: `npm run build` → compiles successfully.

- [ ] **Step 6: Commit**

```bash
git add lib/errors.ts lib/errors.test.ts
git commit -m "add safe error message helper"
```

---

## Task 2: Sanitize join/leave errors

**Files:**
- Modify: `components/game-participation-button.tsx`

**Interfaces:**
- Consumes: `toSafeMessage`, `PARTICIPATION_SAFE_MESSAGES` from `lib/errors`.

No unit test (client UI wiring); gate is the existing suite staying green + lint + build + manual.

- [ ] **Step 1: Add the import**

At the top of `components/game-participation-button.tsx`, add:

```tsx
import { toSafeMessage, PARTICIPATION_SAFE_MESSAGES } from "@/lib/errors";
```

- [ ] **Step 2: Replace the raw error in `run()`**

The current error branch is:

```tsx
    if (rpcError) {
      setError(rpcError.message);
      setPending(false);
      return;
    }
```

Replace it with an action-aware fallback (join vs leave) routed through the participation set:

```tsx
    if (rpcError) {
      const fallback =
        action === "join_game"
          ? "We couldn't join this game. Please try again."
          : "We couldn't leave this game. Please try again.";
      setError(toSafeMessage(rpcError, fallback, PARTICIPATION_SAFE_MESSAGES));
      setPending(false);
      return;
    }
```

(`action` is the `run()` parameter, typed `"join_game" | "leave_game"`.)

- [ ] **Step 3: Verify**

Run: `npm run test` → still green (no test changes).
Run: `npm run lint` → clean.
Run: `npm run build` → compiles.

- [ ] **Step 4: Manual check**

`npm run dev`: join a full game → "This game is full." (verbatim). With a forced non-allowlisted error, the button shows "We couldn't join this game. Please try again." Kill the dev server by port when done.

- [ ] **Step 5: Commit**

```bash
git add components/game-participation-button.tsx
git commit -m "sanitize join leave errors"
```

---

## Task 3: Attendance uses the shared helper

**Files:**
- Modify: `components/host-attendance-manager.tsx`

**Interfaces:**
- Consumes: `toSafeMessage`, `ATTENDANCE_SAFE_MESSAGES` from `lib/errors`.

This removes the local `SAFE_ERRORS` allowlist. Note the conservative narrowing: the old local set included `Authentication required`, `Game not found`, `Only the game creator can update attendance`, and `Participant not found for this game`; those are intentionally **not** in `ATTENDANCE_SAFE_MESSAGES` and now fall back to the generic attendance message (spec-driven).

- [ ] **Step 1: Add the import**

Add to `components/host-attendance-manager.tsx`:

```tsx
import { toSafeMessage, ATTENDANCE_SAFE_MESSAGES } from "@/lib/errors";
```

- [ ] **Step 2: Delete the local allowlist + helper**

Remove this entire block (the `SAFE_ERRORS` set and `attendanceErrorMessage` function):

```tsx
const SAFE_ERRORS = new Set([
  "Authentication required",
  "Game not found",
  "Attendance status must be attended or missed",
  "Only the game creator can update attendance",
  "Attendance cannot be updated before the game starts",
  "Participant not found for this game",
]);

function attendanceErrorMessage(message: string | undefined): string {
  return message && SAFE_ERRORS.has(message)
    ? message
    : "We couldn't update attendance. Refresh and try again.";
}
```

- [ ] **Step 3: Replace the call site**

The current line inside `mark()` is:

```tsx
      setErrorMsg(attendanceErrorMessage(rpcError.message));
```

Replace it with:

```tsx
      setErrorMsg(
        toSafeMessage(
          rpcError,
          "We couldn't update attendance. Refresh and try again.",
          ATTENDANCE_SAFE_MESSAGES,
        ),
      );
```

Leave the `baseBtn` constant, the `mark()` RPC call, `errorPanel`/`note` imports, and all other logic untouched.

- [ ] **Step 4: Verify**

Run: `npm run test` → green.
Run: `npm run lint` → clean (confirm no unused `SAFE_ERRORS`/`attendanceErrorMessage` remain).
Run: `npm run build` → compiles.

- [ ] **Step 5: Manual check**

`npm run dev`, as a host on a started game: mark with an invalid state to trigger a known attendance error → its verbatim message ("Attendance cannot be updated before the game starts" when applicable); any other failure → "We couldn't update attendance. Refresh and try again." Kill the dev server by port.

- [ ] **Step 6: Commit**

```bash
git add components/host-attendance-manager.tsx
git commit -m "use shared error helper for attendance"
```

---

## Task 4: Sanitize form, profile, cancel, and auth errors

**Files:**
- Modify: `components/game-form.tsx`
- Modify: `components/profile-form.tsx`
- Modify: `components/cancel-game-button.tsx`
- Modify: `components/auth-form.tsx`

**Interfaces:**
- Consumes: `toSafeMessage` from `lib/errors` (default `COMMON_SAFE_MESSAGES` set).

All four use the default set with an action-specific fallback. **Validation strings stay direct.**

- [ ] **Step 1: `game-form.tsx` — wrap insert + update, keep validation direct**

Add the import:

```tsx
import { toSafeMessage } from "@/lib/errors";
```

There are two system-error branches (edit update, and create insert). Each currently reads:

```tsx
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
```

Replace **both** occurrences with:

```tsx
      if (error) {
        setError(toSafeMessage(error, "We couldn't save the game. Please try again."));
        setSaving(false);
        return;
      }
```

**Do not touch** the validation line `setError(validationError);` — that comes from local `validate()` and must show directly.

- [ ] **Step 2: `profile-form.tsx` — wrap the upsert error**

Add the import:

```tsx
import { toSafeMessage } from "@/lib/errors";
```

Replace:

```tsx
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
```

with:

```tsx
    if (error) {
      setError(toSafeMessage(error, "We couldn't save your profile. Please try again."));
      setSaving(false);
      return;
    }
```

- [ ] **Step 3: `cancel-game-button.tsx` — wrap the update error**

Add `toSafeMessage` to the imports (it already imports from `@/lib/ui`; add a separate line):

```tsx
import { toSafeMessage } from "@/lib/errors";
```

Replace:

```tsx
    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }
```

with:

```tsx
    if (updateError) {
      setError(toSafeMessage(updateError, "We couldn't cancel the game. Please try again."));
      setPending(false);
      return;
    }
```

- [ ] **Step 4: `auth-form.tsx` — wrap login + signup, keep the identities branch**

Add the import:

```tsx
import { toSafeMessage } from "@/lib/errors";
```

There are two `setError(error.message)` lines (signup at the top of `handleSubmit`, login near the bottom). Replace **both** with the default-set call:

```tsx
        setError(toSafeMessage(error));
```

(Default `fallback` = `GENERIC_ERROR`, default set = `COMMON_SAFE_MESSAGES`, so "Invalid login credentials" / "Email not confirmed" pass through and everything else genericizes.)

**Keep** the existing data-check branch unchanged:

```tsx
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("An account with this email already exists. Try logging in.");
        ...
      }
```

- [ ] **Step 5: Verify**

Run: `npm run test` → green.
Run: `npm run lint` → clean.
Run: `npm run build` → compiles.

- [ ] **Step 6: Manual check**

`npm run dev`:
- Login wrong password → "Invalid login credentials"; force another auth failure → "Something went wrong. Please try again."
- Signup with an existing email → "An account with this email already exists. Try logging in." (unchanged).
- game-form: submit invalid input → the specific validation message still shows; force a DB failure → "We couldn't save the game. Please try again."
- profile save / game cancel failures → their action-specific generic messages.
Kill the dev server by port.

- [ ] **Step 7: Commit**

```bash
git add components/game-form.tsx components/profile-form.tsx components/cancel-game-button.tsx components/auth-form.tsx
git commit -m "sanitize form and auth errors"
```

---

## Task 5: Log swallowed data-layer errors

**Files:**
- Modify: `lib/games.ts`
- Modify: `lib/participation.ts`
- Modify: `lib/roster.ts`

**Interfaces:**
- Consumes: nothing. Pure logging side-effect; return shapes unchanged.

**Rule:** immediately before each `return { ..., error: true }` taken because of a Supabase error, insert `console.error("<enclosingFunctionName>", <the error variable checked in the enclosing if>)`. Apply to exactly the branches listed below. **Skip** the one propagation branch noted (it has no Supabase error object and the root cause is already logged at its source). Do not log the `return null` single-fetch branches (out of scope — they don't return the boolean flag).

Representative example (the shape every edit follows):

```ts
  if (error) {
    console.error("fetchPublicGames", error);
    return { games: [], error: true };
  }
```

- [ ] **Step 1: `lib/games.ts` — add logging to five branches**

Insert `console.error(...)` as the first line inside each of these error branches:

- `fetchPublicGames` → `console.error("fetchPublicGames", error)`
- `fetchCurrentUserJoinedGames` → `console.error("fetchCurrentUserJoinedGames", error)` — **only** the branch after the games query (the `const { data, error } = ...` one). **Skip** the earlier `if (participationError)` propagation branch (no Supabase error object; already logged in `getJoinedGameIds`).
- `fetchCurrentUserHostedGames` → `console.error("fetchCurrentUserHostedGames", error)`
- `fetchCurrentUserPastHostedGames` → `console.error("fetchCurrentUserPastHostedGames", error)`
- `fetchCurrentUserPastJoinedGames` → two branches: `console.error("fetchCurrentUserPastJoinedGames", partError)` before the `partError` return, and `console.error("fetchCurrentUserPastJoinedGames", error)` before the games-query return.

- [ ] **Step 2: `lib/participation.ts` — add logging to three branches**

- `getJoinedGameIds` → `console.error("getJoinedGameIds", error)`
- `getGameParticipation` → `console.error("getGameParticipation", error)`
- `getCurrentUserAttendanceCounts` → `console.error("getCurrentUserAttendanceCounts", error)`

Use the error variable checked in each enclosing `if` (the one returned-on). If a branch's checked variable is named differently, log that variable.

- [ ] **Step 3: `lib/roster.ts` — add logging to two branches**

- `fetchGameRoster` → `console.error("fetchGameRoster", error)`
- `fetchHostGameParticipants` → `console.error("fetchHostGameParticipants", error)`

- [ ] **Step 4: Verify**

Run: `npm run test` → green (no behavior change).
Run: `npm run lint` → clean.
Run: `npm run build` → compiles.

- [ ] **Step 5: Manual check**

`npm run dev`: force a data-layer query to fail (e.g. temporarily break a column name, or disconnect Supabase) and load `/dashboard` → the server console prints `console.error` with the function name; the page still renders its existing "We couldn't load…" copy (no shape/UX change). Revert the forced break. Kill the dev server by port.

- [ ] **Step 6: Commit**

```bash
git add lib/games.ts lib/participation.ts lib/roster.ts
git commit -m "log swallowed data layer errors"
```

---

## Self-Review (against the spec)

- **Sanitize client errors** (spec goal 1) → Tasks 2–4 cover all six leaky components; `toSafeMessage` from Task 1. ✓
- **Validation vs system** (spec goal 2 / §3) → Task 4 Step 1 explicitly keeps `validate()` direct in game-form; profile-form has no local `validate()`. ✓
- **Server logging** (spec goal 3 / §4) → Task 5, `console.error("fn", error)`, shapes unchanged, no external service. ✓
- **Three conservative sets + 3-param helper** (spec §1) → Task 1 implements verbatim; test asserts privacy strings excluded. ✓
- **Per-action wiring** (spec §2 table) → Task 2 participation+join/leave fallback; Task 3 attendance set + existing fallback; Task 4 default set + action fallbacks. ✓
- **host-attendance-manager dedupe** (spec §2) → Task 3 deletes local allowlist. ✓
- **Out-of-scope** (spec) → Global Constraints forbid schema/migration/RLS/RPC/toast/dependency/UI-redesign/shape changes. ✓
- **Testing** (spec) → Task 1 TDD with the spec's exact cases; every task runs `npm run test` + lint + build + manual. ✓

Type consistency: `toSafeMessage(error, fallback?, safeMessages?)` signature and the three set names are identical across Task 1 (defined) and Tasks 2–4 (consumed). No placeholders — every code step shows complete code; Task 5 enumerates each branch by function name + variable.
