# Host Edit & Cancel Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a game's creator edit its details or soft-cancel it before it starts, with canceled games staying visible to joined players as `CANCELED`.

**Architecture:** Edit and cancel are direct client `.update()` writes guarded by the existing `"Users can update their own games"` RLS policy — no new RPC. Cancel sets a new nullable `canceled_at` column; only `join_game` changes server-side, to reject canceled games. The ~200-line create form is extracted into a shared `GameForm` reused by create and a new edit route.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (Postgres + RLS), TypeScript, Tailwind v4, Vitest.

## Global Constraints

- Next.js 16: middleware is `proxy.ts`; `createClient()` from `lib/supabase/server.ts` is **async** (`await`).
- Path alias `@/*` → repo root.
- Auth id via `getCurrentUserId()` (`lib/auth.ts`), which wraps `supabase.auth.getClaims()`.
- Supabase clients by context: `lib/supabase/client.ts` (browser/`"use client"`), `server.ts` (Server Components).
- Run tests with `npm test` (`vitest run`); a single file with `npx vitest run <path>`.
- Lint with `npm run lint`; typecheck/build with `npm run build`.
- Commit messages: lowercase imperative, `<action> <change>`.
- Shared UI class tokens come from `lib/ui.ts` (`field`, `label`, `btnPrimary`, `errorPanel`, `successPanel`).
- Edit/cancel allowed only before `starts_at`.

---

### Task 1: Migration — add `canceled_at` and reject canceled joins

**Files:**
- Create: `supabase/migrations/007_add_game_cancellation.sql`

**Interfaces:**
- Consumes: existing `public.games`, `public.join_game(uuid)` from migrations 002 / 004.
- Produces: `games.canceled_at timestamptz` (null = live); `join_game` raises `'This game has been canceled'` for canceled games.

- [ ] **Step 1: Write the migration**

Re-create `join_game` verbatim from `004_add_game_participation_functions.sql`, inserting the canceled check immediately after the "already started" check. Keep `security definer` and `set search_path = ''`.

```sql
alter table public.games
  add column canceled_at timestamptz;

create or replace function public.join_game(target_game_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_game     public.games%rowtype;
  active_count    integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into target_game
  from public.games
  where id = target_game_id
  for update;

  if not found then
    raise exception 'Game not found';
  end if;

  if not target_game.is_public then
    raise exception 'This game is not public';
  end if;

  if target_game.starts_at <= now() then
    raise exception 'This game has already started';
  end if;

  if target_game.canceled_at is not null then
    raise exception 'This game has been canceled';
  end if;

  if exists (
    select 1
    from public.game_participants
    where game_id = target_game_id
      and user_id = current_user_id
  ) then
    raise exception 'You have already joined this game';
  end if;

  select count(*) into active_count
  from public.game_participants
  where game_id = target_game_id
    and status in ('joined', 'attended');

  if active_count >= target_game.max_players then
    raise exception 'This game is full';
  end if;

  insert into public.game_participants (game_id, user_id, status)
  values (target_game_id, current_user_id, 'joined');
end;
$$;

revoke all on function public.join_game(uuid) from public, anon;
grant execute on function public.join_game(uuid) to authenticated;
```

- [ ] **Step 2: Verify the SQL is self-consistent**

Re-read the file. Confirm: the canceled check sits after the `starts_at` check and before the duplicate-join check; `create or replace` is used (not `create`); grants are re-asserted. No app code references `canceled_at` yet, so nothing else needs touching in this task.

- [ ] **Step 3: Apply (if a local Supabase/psql is available)**

Run the project's usual migration step against the dev database (e.g. `supabase db push` or piping the file into `psql`). If no local DB is available, note that this migration must be applied before manual verification of later tasks.
Expected: column added, function replaced, no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/007_add_game_cancellation.sql
git commit -m "add game cancellation column and join guard"
```

---

### Task 2: Shared form fields, defaults, and validation (`lib/game-fields.ts`)

**Files:**
- Create: `lib/game-fields.ts`
- Test: `lib/game-fields.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type GameFields = { title; location_name; area; date; time; game_type; max_players; competitiveness; min_skill_level; max_skill_level; notes }` (all `string`).
  - `const gameTypes: string[]`, `competitivenessLevels: string[]`, `skillLevels: string[]`.
  - `const emptyGame: GameFields`.
  - `function validate(fields: GameFields): string | null` — returns an error message or `null`.
  - `function fieldsToRow(fields: GameFields, creatorId?: string): Record<string, unknown>` — DB payload; includes `creator_id` and `is_public: true` only when `creatorId` is provided.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/game-fields.test.ts
import { describe, it, expect } from "vitest";
import { validate, fieldsToRow, emptyGame, type GameFields } from "./game-fields";

const valid: GameFields = {
  title: "Saturday Run",
  location_name: "Lincoln Park Courts",
  area: "North Side, Chicago",
  date: "2030-01-01",
  time: "09:00",
  game_type: "3v3",
  max_players: "10",
  competitiveness: "Casual",
  min_skill_level: "Beginner",
  max_skill_level: "Advanced",
  notes: "Bring a light and dark shirt.",
};

describe("validate", () => {
  it("returns null for a valid game", () => {
    expect(validate(valid)).toBeNull();
  });

  it("flags a missing required field with its label", () => {
    expect(validate({ ...valid, title: "  " })).toMatch(/Game title is required/);
  });

  it("rejects non-positive max players", () => {
    expect(validate({ ...valid, max_players: "0" })).toMatch(/positive whole number/);
  });

  it("rejects non-integer max players", () => {
    expect(validate({ ...valid, max_players: "2.5" })).toMatch(/positive whole number/);
  });

  it("rejects a max skill below the min skill", () => {
    expect(
      validate({ ...valid, min_skill_level: "Advanced", max_skill_level: "Beginner" }),
    ).toMatch(/cannot be below/);
  });

  it("rejects an unparseable date/time", () => {
    expect(validate({ ...valid, date: "", time: "" })).not.toBeNull();
  });
});

describe("fieldsToRow", () => {
  it("builds an ISO starts_at and trims strings", () => {
    const row = fieldsToRow(valid);
    expect(typeof row.starts_at).toBe("string");
    expect(row.title).toBe("Saturday Run");
    expect(row).not.toHaveProperty("date");
  });

  it("includes creator_id and is_public only when a creatorId is given", () => {
    expect(fieldsToRow(valid)).not.toHaveProperty("creator_id");
    const owned = fieldsToRow(valid, "user-1");
    expect(owned.creator_id).toBe("user-1");
    expect(owned.is_public).toBe(true);
  });

  it("maps empty notes to null", () => {
    expect(fieldsToRow({ ...valid, notes: "   " }).notes).toBeNull();
  });

  it("emptyGame fails validation (date/time blank)", () => {
    expect(validate(emptyGame)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/game-fields.test.ts`
Expected: FAIL — `Cannot find module './game-fields'`.

- [ ] **Step 3: Write `lib/game-fields.ts`**

Move the constants, `GameFields`, `emptyGame`, and the validation body out of `components/create-game-form.tsx` verbatim, wrapping the validation in an exported `validate`, and add `fieldsToRow`.

```ts
export const gameTypes = ["3v3", "4v4", "5v5", "Open Run"];
export const competitivenessLevels = ["Casual", "Competitive", "Highly Competitive"];
export const skillLevels = ["Beginner", "Intermediate", "Advanced", "Elite"];

export type GameFields = {
  title: string;
  location_name: string;
  area: string;
  date: string;
  time: string;
  game_type: string;
  max_players: string;
  competitiveness: string;
  min_skill_level: string;
  max_skill_level: string;
  notes: string;
};

export const emptyGame: GameFields = {
  title: "",
  location_name: "",
  area: "",
  date: "",
  time: "",
  game_type: gameTypes[0],
  max_players: "",
  competitiveness: competitivenessLevels[0],
  min_skill_level: skillLevels[0],
  max_skill_level: skillLevels[0],
  notes: "",
};

export function validate(fields: GameFields): string | null {
  const required: [keyof GameFields, string][] = [
    ["title", "Game title"],
    ["location_name", "Location name"],
    ["area", "City / area"],
    ["date", "Date"],
    ["time", "Time"],
    ["max_players", "Max players"],
  ];
  for (const [key, fieldLabel] of required) {
    if (!fields[key].trim()) {
      return `${fieldLabel} is required.`;
    }
  }

  const maxPlayers = Number(fields.max_players);
  if (!Number.isInteger(maxPlayers) || maxPlayers <= 0) {
    return "Max players must be a positive whole number.";
  }

  if (skillLevels.indexOf(fields.max_skill_level) < skillLevels.indexOf(fields.min_skill_level)) {
    return "Maximum skill level cannot be below the minimum skill level.";
  }

  const startsAt = new Date(`${fields.date}T${fields.time}`);
  if (Number.isNaN(startsAt.getTime())) {
    return "The date and time combination is not valid.";
  }

  return null;
}

export function fieldsToRow(
  fields: GameFields,
  creatorId?: string,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    title: fields.title.trim(),
    location_name: fields.location_name.trim(),
    area: fields.area.trim(),
    starts_at: new Date(`${fields.date}T${fields.time}`).toISOString(),
    game_type: fields.game_type,
    max_players: Number(fields.max_players),
    competitiveness: fields.competitiveness,
    min_skill_level: fields.min_skill_level,
    max_skill_level: fields.max_skill_level,
    notes: fields.notes.trim() || null,
  };
  if (creatorId) {
    row.creator_id = creatorId;
    row.is_public = true;
  }
  return row;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/game-fields.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/game-fields.ts lib/game-fields.test.ts
git commit -m "extract shared game form fields and validation"
```

---

### Task 3: `isCanceled` on the model + browse exclusion + edit fetch

**Files:**
- Modify: `lib/types.ts` (add `isCanceled` to `PickupGame`)
- Modify: `lib/games.ts` (`GAME_COLUMNS`, `GameRow`, `mapGameRow`, `fetchPublicGames`, add `fetchGameForEdit`)

**Interfaces:**
- Consumes: `getCurrentUserId` from `lib/auth.ts`.
- Produces:
  - `PickupGame.isCanceled: boolean`.
  - `fetchGameForEdit(id: string): Promise<GameRow | null>` — returns the raw row only when the current user is the creator, else `null`. `GameRow` is exported for the edit page.

- [ ] **Step 1: Add the field to the model**

In `lib/types.ts`, add to `PickupGame`:

```ts
  isCanceled: boolean;
```

- [ ] **Step 2: Thread `canceled_at` through `lib/games.ts`**

```ts
// GAME_COLUMNS — append canceled_at
const GAME_COLUMNS = "id, creator_id, title, location_name, area, starts_at, game_type, max_players, competitiveness, min_skill_level, max_skill_level, notes, canceled_at";

// GameRow — add field, and export the type for the edit page
export type GameRow = {
  // ...existing fields...
  notes: string | null;
  canceled_at: string | null;
};

// mapGameRow — set isCanceled
function mapGameRow(row: GameRow, currentPlayers = 0): PickupGame {
  return {
    // ...existing fields...
    notes: row.notes ?? "No notes provided.",
    isCanceled: row.canceled_at !== null,
  };
}
```

- [ ] **Step 3: Exclude canceled games from browse**

In `fetchPublicGames`, add to the query chain (after `.eq("is_public", true)`):

```ts
    .is("canceled_at", null)
```

Leave `fetchCurrentUserJoinedGames`, `fetchCurrentUserHostedGames`, and `fetchCurrentUserPastHostedGames` unchanged — they keep canceled games so the badge shows.

- [ ] **Step 4: Add `fetchGameForEdit`**

```ts
export async function fetchGameForEdit(id: string): Promise<GameRow | null> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as GameRow;
  return row.creator_id === userId ? row : null;
}
```

- [ ] **Step 5: Verify build/typecheck passes**

Run: `npm run build`
Expected: build succeeds; no type error about a missing `isCanceled` on any `PickupGame` literal. (The test helper in `lib/game-filters.test.ts` builds a `PickupGame` literal — if the build/`npm test` flags it, add `isCanceled: false` there.)

- [ ] **Step 6: Run the existing test suite**

Run: `npm test`
Expected: PASS (existing `game-filters` and `match` tests still green; `game-fields` green).

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/games.ts lib/game-filters.test.ts
git commit -m "add canceled state to game model and edit fetch"
```

---

### Task 4: Shared `GameForm` component; rewire create; delete old form

**Files:**
- Create: `components/game-form.tsx`
- Modify: `app/games/new/page.tsx` (render `GameForm`)
- Delete: `components/create-game-form.tsx`

**Interfaces:**
- Consumes: `GameFields`, `emptyGame`, `validate`, `fieldsToRow`, the three option arrays from `lib/game-fields.ts`; `createClient` from `lib/supabase/client.ts`; UI tokens from `lib/ui.ts`.
- Produces: `<GameForm mode="create" | "edit" gameId? initial? />`.

- [ ] **Step 1: Create `components/game-form.tsx`**

Start from the current `create-game-form.tsx`. Remove the moved constants/types/`validate` (now imported from `lib/game-fields.ts`). Keep the entire field markup (`<form>…</form>`) **verbatim** from the old file. Apply these changes:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { field, label, btnPrimary, errorPanel, successPanel } from "@/lib/ui";
import {
  emptyGame,
  fieldsToRow,
  validate,
  gameTypes,
  competitivenessLevels,
  skillLevels,
  type GameFields,
} from "@/lib/game-fields";

type Props = {
  mode: "create" | "edit";
  gameId?: string;
  initial?: GameFields;
};

export default function GameForm({ mode, gameId, initial }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "unauthenticated" | "ready">(
    mode === "edit" ? "ready" : "loading",
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [fields, setFields] = useState<GameFields>(initial ?? emptyGame);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create needs the signed-in user's id for the insert; edit is already
  // guarded + prefilled on the server, so it skips the auth round-trip.
  useEffect(() => {
    if (mode === "edit") return;
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      if (!user) {
        setStatus("unauthenticated");
        return;
      }
      setUserId(user.id);
      setStatus("ready");
    });
    return () => {
      active = false;
    };
  }, [mode]);

  function update<K extends keyof GameFields>(key: K, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validate(fields);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (mode === "edit") {
      const { error } = await supabase
        .from("games")
        .update(fieldsToRow(fields))
        .eq("id", gameId!);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      setSuccess("Changes saved! Redirecting…");
      router.push(`/games/${gameId}`);
      router.refresh();
      return;
    }

    if (!userId) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("games")
      .insert(fieldsToRow(fields, userId));
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    setSuccess("Game created! Redirecting…");
    router.push("/dashboard");
  }

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

  // ... PASTE the entire <form>…</form> markup verbatim from the old
  // create-game-form.tsx here. Change only the two pieces below:
  //   - submit button label: {saving ? (mode === "edit" ? "Saving…" : "Creating…") : (mode === "edit" ? "Save changes" : "Create game")}
  //   - the "Cancel and go back" Link href: mode === "edit" ? `/games/${gameId}` : "/dashboard"
}
```

- [ ] **Step 2: Update `app/games/new/page.tsx`**

Replace the `CreateGameForm` import and usage with `GameForm`:

```tsx
import GameForm from "@/components/game-form";
// ...
<GameForm mode="create" />
```

- [ ] **Step 3: Delete the old form**

```bash
git rm components/create-game-form.tsx
```

- [ ] **Step 4: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: succeeds; no remaining import of `create-game-form`.

- [ ] **Step 5: Manual smoke — create still works**

Run `npm run dev`, sign in, go to `/games/new`, create a game, confirm redirect to `/dashboard` and the game appears. Then stop the dev server (kill the port, not just the wrapper).

- [ ] **Step 6: Commit**

```bash
git add components/game-form.tsx app/games/new/page.tsx
git commit -m "extract shared game form component"
```

---

### Task 5: Edit route (`app/games/[id]/edit/page.tsx`)

**Files:**
- Create: `app/games/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `fetchGameForEdit`, `isUuid`, `isGameStarted` from `lib/games.ts`; `GameForm`; `GameFields` from `lib/game-fields.ts`; `SiteHeader`.
- Produces: route `/games/[id]/edit`.

- [ ] **Step 1: Write the page**

Split `starts_at` into the `date` + `time` strings the inputs expect. Redirect started or canceled games back to detail (nothing to edit).

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GameForm from "@/components/game-form";
import SiteHeader from "@/components/site-header";
import { fetchGameForEdit, isGameStarted, isUuid } from "@/lib/games";
import type { GameFields } from "@/lib/game-fields";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }

  const row = await fetchGameForEdit(id);
  if (!row) {
    notFound();
  }

  if (isGameStarted(row.starts_at) || row.canceled_at !== null) {
    redirect(`/games/${id}`);
  }

  const starts = new Date(row.starts_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const initial: GameFields = {
    title: row.title,
    location_name: row.location_name,
    area: row.area,
    date: `${starts.getFullYear()}-${pad(starts.getMonth() + 1)}-${pad(starts.getDate())}`,
    time: `${pad(starts.getHours())}:${pad(starts.getMinutes())}`,
    game_type: row.game_type,
    max_players: String(row.max_players),
    competitiveness: row.competitiveness,
    min_skill_level: row.min_skill_level,
    max_skill_level: row.max_skill_level,
    notes: row.notes ?? "",
  };

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <SiteHeader />
        <div className="mt-12 max-w-3xl">
          <Link
            href={`/games/${id}`}
            className="text-sm text-muted transition hover:text-ink"
          >
            ← Back to game
          </Link>
          <h1 className="mt-6 font-display text-4xl font-bold uppercase leading-tight tracking-tight md:text-5xl">
            Edit game
          </h1>
          <GameForm mode="edit" gameId={id} initial={initial} />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds; route `/games/[id]/edit` compiles.

- [ ] **Step 3: Manual smoke**

`npm run dev`, as the creator open `/games/<id>/edit`, change the time + notes, save, confirm the detail page shows the new values. Confirm a non-creator (or signed-out) hitting the URL gets a 404. Stop the dev server (kill the port).

- [ ] **Step 4: Commit**

```bash
git add "app/games/[id]/edit/page.tsx"
git commit -m "add game edit route"
```

---

### Task 6: Cancel button (`components/cancel-game-button.tsx`)

**Files:**
- Create: `components/cancel-game-button.tsx`

**Interfaces:**
- Consumes: `createClient` from `lib/supabase/client.ts`; `btnPrimary`, `errorPanel` from `lib/ui.ts`.
- Produces: `<CancelGameButton gameId={string} />`.

- [ ] **Step 1: Write the component**

Two-step confirm, no extra deps. Writes `canceled_at` via the existing creator-update RLS policy.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, errorPanel } from "@/lib/ui";

export default function CancelGameButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("games")
      .update({ canceled_at: new Date().toISOString() })
      .eq("id", gameId);
    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={btnPrimary}>
        Cancel game
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Cancel this game? Joined players will see it marked canceled. This can&rsquo;t be undone.
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={cancel} disabled={pending} className={btnPrimary}>
          {pending ? "Canceling…" : "Yes, cancel game"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="text-sm font-bold uppercase tracking-wide text-muted transition hover:text-ink"
        >
          Keep game
        </button>
      </div>
      {error && <p className={errorPanel}>{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds (component compiles even before it is wired into the page).

- [ ] **Step 3: Commit**

```bash
git add components/cancel-game-button.tsx
git commit -m "add cancel game button"
```

---

### Task 7: Wire edit/cancel + canceled state into the detail page

**Files:**
- Modify: `app/games/[id]/page.tsx`

**Interfaces:**
- Consumes: `CancelGameButton`; `game.isCanceled`; existing `isCreator` / `hasStarted`.
- Produces: detail page renders host edit/cancel controls and a canceled banner.

- [ ] **Step 1: Import the button**

```tsx
import CancelGameButton from "@/components/cancel-game-button";
```

- [ ] **Step 2: Add a canceled banner under the date line**

After the `dateTimeDisplay` paragraph (around line 84-86), add:

```tsx
{game.isCanceled && (
  <p className="mt-4 border-2 border-vermilion-ink bg-vermilion-ink/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-vermilion-ink">
    Canceled by the host
  </p>
)}
```

- [ ] **Step 3: Suppress join when canceled; otherwise keep the button**

Replace the participation block (around line 95-105) so a canceled game shows a notice instead of the join/leave button:

```tsx
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
```

- [ ] **Step 4: Add host edit/cancel controls**

Immediately after that block, add host-only controls shown only before start and while live:

```tsx
{isCreator && !hasStarted && !game.isCanceled && (
  <div className="mt-6 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
    <Link href={`/games/${game.id}/edit`} className={btnPrimary}>
      Edit game
    </Link>
    <CancelGameButton gameId={game.id} />
  </div>
)}
```

Add `btnPrimary` to the existing `lib/ui` import (the page already imports `Link` from `next/link`):

```tsx
import { btnPrimary } from "@/lib/ui";
```

- [ ] **Step 5: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: succeeds.

- [ ] **Step 6: Manual smoke — full cancel flow**

`npm run dev`: as creator, open your game, click **Cancel game** → confirm. Page shows the canceled banner and no join button. Confirm the game disappears from `/games`. Open it from the dashboard "Joined/Hosted" list and confirm the canceled state shows. Confirm a second account gets `'This game has been canceled'` if it tries to join via a stale tab. Stop the dev server (kill the port).

- [ ] **Step 7: Commit**

```bash
git add "app/games/[id]/page.tsx"
git commit -m "add host edit and cancel controls to game detail"
```

---

### Task 8: `CANCELED` badge on the game card

**Files:**
- Modify: `components/game-card.tsx`

**Interfaces:**
- Consumes: `game.isCanceled`.
- Produces: a `CANCELED` badge in the card's existing top-right badge row.

- [ ] **Step 1: Add the badge**

In the badge row (the `<div className="flex items-center gap-2">` around line 51), render a canceled badge before the match/spots badges:

```tsx
<div className="flex items-center gap-2">
  {game.isCanceled && (
    <span className="shrink-0 bg-vermilion-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-paper">
      Canceled
    </span>
  )}
  {match && <MatchBadge match={match} />}
  <SpotsBadge spotsLeft={spotsLeft} />
</div>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual check**

`npm run dev`, view the dashboard with a canceled hosted/joined game and confirm the `CANCELED` badge renders on its card. Stop the dev server (kill the port).

- [ ] **Step 4: Commit**

```bash
git add components/game-card.tsx
git commit -m "show canceled badge on game cards"
```

---

## Final verification

- [ ] Run `npm test` — all unit tests pass.
- [ ] Run `npm run build && npm run lint` — clean.
- [ ] Confirm no remaining reference to `create-game-form`: `git grep create-game-form` returns nothing.
