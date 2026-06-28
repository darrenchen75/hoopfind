# Deployment Readiness — Design

Date: 2026-06-28

## Goal

Prepare HoopFind for a clean first deployment to Vercel + Supabase production:
environment-variable clarity, a Supabase/Vercel deploy checklist, README/demo
polish, and a manual QA pass. **Deployment readiness only** — no new features,
no schema changes (unless a true blocker is found — none was), no UI redesign,
no new dependencies.

## Inspection summary (current readiness)

What the codebase already does well — **no action needed**:

- **Only two env vars, both public.** `lib/supabase/client.ts`, `server.ts`, and
  `proxy.ts` read `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No service-role key, no server-only
  secret anywhere. (Publishable key is the client-safe key — correct choice.)
- **No secrets committed.** `git ls-files` shows no tracked `.env`/secret files;
  no env file appears anywhere in history; `.env.local` is untracked.
- **Host-agnostic auth redirect.** `proxy.ts` builds the login redirect from
  `request.url` (`new URL("/login", request.url)`), so protected-route redirects
  work on any domain (localhost or Vercel) with no code change.
- **No open redirect.** `auth-form.tsx` only honors a `redirectTo` that
  `startsWith("/")` and not `"//"` — internal paths only.
- **No user-facing debug logging.** The only `console.*` calls are the 11
  intentional server-side `console.error("fn", error)` in the data layer
  (`lib/games.ts`, `participation.ts`, `roster.ts`). No `console.log`/`debug`.
- **Security in the DB.** RLS `enable`/`create policy` and `security definer`
  RPCs are present across migrations 001–010; no `storage.` references (storage
  not required).
- **Vercel-friendly.** `next.config.ts` is default; Next.js 16 is auto-detected;
  default build/install; no `vercel.json` needed.

Gaps to close (all config/docs — **no app code or schema changes**):

1. **`.gitignore` would also ignore `.env.example`.** Line 34 is `.env*`, which
   matches `.env.example`. A committed example needs an explicit un-ignore.
2. **No `.env.example` exists.** Newcomers/Vercel setup have no canonical var list
   (only the README mentions them).
3. **README is missing deployment-facing sections** — DB/security highlights,
   deployment notes (Vercel + Supabase), a reviewer demo flow, and a
   screenshots/demo placeholder. (Summary, tech stack, features, local setup,
   env vars, and scripts are already present and good.)
4. **Auth redirect URLs are Supabase-dashboard config, not code.** Because the
   app never builds absolute auth URLs (no `emailRedirectTo`, no `origin`/
   `VERCEL_URL` usage), email/confirmation links use Supabase's **Site URL** +
   **Additional Redirect URLs**. These must be set for both localhost and the
   Vercel domain. Dashboard task, no code.
5. **Email-confirmation behavior is a Supabase toggle.** `signUp()` passes no
   `emailRedirectTo`; whether signup returns a session immediately depends on the
   Supabase "Confirm email" setting. For a frictionless MVP demo, recommend
   **disabling email confirmation** (instant session) or documenting the confirm
   step (see §6).

---

## 1. Environment variables

**The only variables the app uses (both public, client-safe):**

| Variable | Where | Value |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | local `.env.local` + Vercel | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | local `.env.local` + Vercel | Supabase **publishable** key (`sb_publishable_…`), **not** the legacy anon key, **not** the service-role key |

- **Local:** copy `.env.example` → `.env.local`, fill both values.
- **Vercel:** add both under Project → Settings → Environment Variables, for the
  Production (and Preview, if used) environments. They are `NEXT_PUBLIC_*`, so
  they are embedded in the client bundle — that is expected and safe for these
  two values.
- **No other secrets.** Do not add a service-role key; nothing in the app needs
  it, and adding one would put a privileged secret where it isn't required.

**Add `.env.example`** (so the required vars are discoverable) and **un-ignore it**
in `.gitignore` (see §“Exact file updates”).

**Secret check (run after adding `.env.example`, before first deploy):**
`git ls-files | grep -i env` should return **only** `.env.example`. Confirm:
`.env.example` **is** tracked, `.env.local` is **not** tracked, and no real
secret-bearing env file is tracked. (Before `.env.example` is added the grep
returns nothing — that's the current state.)

## 2. Supabase deployment checklist

- [ ] Create the production Supabase project (or reuse the dev one).
- [ ] **Apply migrations 001–010 in order** (`supabase/migrations/`) via the SQL
      editor or `supabase db push`. Order matters (later migrations alter earlier
      objects, e.g. 005 tightens visibility, 009 rebuilds the roster function).
- [ ] **Confirm RLS** is enabled on `profiles`, `games`, `game_participants`
      (migrations 001/002/003 enable it; 005 tightens participant visibility).
      Spot-check in Supabase → Auth → Policies that each table shows policies and
      "RLS enabled".
- [ ] **Confirm RPC functions exist** (Database → Functions): `join_game`,
      `leave_game` (004), `get_game_roster`, `get_host_game_participants`,
      `set_participant_attendance` (006/009). These are `security definer` —
      verify they're present after the migration run. (Migration 007 does **not**
      add a cancellation RPC — it adds the `games.canceled_at` column, tightens
      update behavior, and patches `join_game` to reject canceled games. Game
      cancellation itself is a direct `games` table update guarded by RLS / the
      hosted-game update policy, not an RPC.)
- [ ] **Storage:** none required — do not create buckets.
- [ ] **Auth → URL Configuration:** set **Site URL** and **Additional Redirect
      URLs** to include both `http://localhost:3000` and the Vercel production URL
      (e.g. `https://hoopfind.vercel.app`). Add the Vercel preview pattern too if
      previews are used.
- [ ] **Email auth (MVP decision):** recommend **disabling "Confirm email"**
      (Auth → Providers → Email) so signup yields an immediate session and the
      demo flow has no email round-trip. If confirmation is left on, the app
      already shows "Account created. Check your email to confirm" — acceptable,
      but document it in the README demo section.

## 3. Vercel deployment checklist

- [ ] Import the GitHub repo into Vercel. **Framework preset:** Next.js
      (auto-detected).
- [ ] **Build command:** default `next build` (no override). **Install command:**
      default `npm install` (no override). **Output:** default. No `vercel.json`
      needed.
- [ ] **Node version:** ensure 20+ (project requires Node 20+); set via Vercel
      project settings if the default differs.
- [ ] **Environment variables:** add the two `NEXT_PUBLIC_*` vars (§1) to
      Production (and Preview).
- [ ] **First deploy**, then copy the production URL into Supabase Auth Site URL +
      Redirect URLs (§2).
- [ ] **Post-deploy smoke test:** load `/`, `/games`, sign up/login, hit a
      protected route signed-out (`/dashboard` → should redirect to `/login`),
      then signed-in (loads). Confirm no 500s and that game times render in the
      game's timezone.

## 4. App readiness gate

Run locally before deploying (all must pass — these are the existing gates):

- [ ] `npm run test` — Vitest green (`lib/*.test.ts`, incl. `errors`, `datetime`,
      `reliability`, `match`, `game-fields`, `game-filters`).
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — compiles (TypeScript + Next build).
- [ ] **No user-facing debug logs** — confirmed: only server-side
      `console.error` in the data layer; nothing logged to the client UI.
- [ ] **Safe error handling intact** — system/Supabase errors render via
      `toSafeMessage` (sanitized); validation messages still specific. (Shipped in
      the error-handling cleanup; smoke-test one bad action post-deploy.)
- [ ] **Timezone behavior** — after deploy, create a game and confirm the
      displayed time matches what was entered; open edit and save without
      changing the time, confirming it does not shift (the Vercel server tz must
      not leak). Verify on the live deployment, not just locally.

## 5. README / portfolio polish

Keep the existing sections (summary, tech stack, features, local setup, env,
scripts). **Add** these sections:

- **Database & security highlights** — Postgres + RLS on every table; sensitive
  actions like join/leave, roster reads, and attendance updates go through
  `security definer` RPCs so authorization is enforced in the database, not just
  the client; game cancellation is a direct `games` table update protected by
  RLS and the hosted-game update policy; conservative, sanitized user-facing
  error messages.
- **Deployment** — short "Deploying to Vercel + Supabase" subsection pointing at
  this checklist: set the two env vars on Vercel, apply migrations 001–010, set
  Supabase Site URL + redirect URLs to the Vercel domain.
- **Demo flow** — the reviewer walkthrough from §6.
- **Screenshots / demo** — a placeholder section (e.g. `<!-- screenshots: add
  dashboard, game detail, roster, attendance -->` plus a "Live demo: <url>" line
  to fill in) so the portfolio framing exists even before assets are captured.

Exact diffs are in “Exact file updates” below.

## 6. Demo data / demo flow

**Demo account:** one signup (email + password). With email confirmation off,
this lands straight in the app. Complete a profile: a mid-range skill level, a
primary position, a play style, an area, and a max travel distance — enough that
skill-match labels render meaningfully.

**Suggested sample games** (create 3–4 as the demo host so browse/dashboard look
populated):

- "Saturday Morning Run" — competitive, skill range covering the demo profile,
  10 players, a near-future start.
- "Casual Evening 5s" — casual, wider skill range, soon-ish start.
- "Lunchtime Pickup" — different area, smaller cap (to show the "spots left"/full
  states).
- One game with a **past** start time (or mark attendance after start) so the
  show-up rate and Past games sections have data.

**Reviewer flow (put in README):**

1. Sign up / log in.
2. Complete the player profile.
3. Browse public games (`/games`) — note skill-match labels + filters.
4. Create a game (`/games/new`).
5. Join a game (as the player) — see the roster update.
6. Open a game detail, view the roster (join-gated).
7. As host, after a game starts, mark attendance (attended/missed).
8. View your show-up rate + Past games on the dashboard.

## 7. Manual QA checklist

Run on the **live deployment**, desktop + ~360px mobile:

- [ ] **Auth** — sign up, log out, log in; wrong password shows "Invalid login
      credentials"; signup with an existing email shows the "account exists" hint.
- [ ] **Profile setup** — save a profile; values persist; protected when signed
      out.
- [ ] **Create game** — valid create succeeds; invalid input shows the specific
      validation message (not a generic one).
- [ ] **Browse games** — grid renders, filters work, empty state shows when no
      games.
- [ ] **Game detail** — info hierarchy, skill-match label,
      players/skill/competitiveness.
- [ ] **Join / leave** — counts update; full game → "This game is full"; leave
      after start blocked with its message.
- [ ] **Edit / cancel (host)** — edit prefills in the game timezone; cancel shows
      the canceled banner; controls hidden after start.
- [ ] **Roster permissions** — logged-out and non-member can't see the roster;
      member/host can.
- [ ] **Attendance marking (host)** — attended/missed toggle; `aria-pressed`
      reflects state; only works after start.
- [ ] **Show-up rate** — dashboard summary + roster badges compute correctly.
- [ ] **Past games** — joined + hosted history sections populate.
- [ ] **Timezone-safe edit** — create a game, confirm the displayed time matches
      what was entered; open edit, save without changing the time, and confirm
      the displayed time does not shift on the deployed server. (Advanced, if
      practical: repeat with the browser/OS timezone changed.)
- [ ] **Mobile layout** — no horizontal scroll at ~360px; 44px touch targets;
      titles wrap.
- [ ] **Safe error handling** — force a system error → generic safe message, no
      raw Postgres text.
- [ ] **Protected-route redirect** — `/dashboard`, `/profile/setup`, `/games/new`
      redirect to `/login` when signed out, then return after login.

## Exact file updates

### `.gitignore` — un-ignore the example

After the `.env*` line, add an exception:

```gitignore
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

### `.env.example` (new, committed)

```bash
# Supabase project credentials — both are public, client-safe keys.
# Copy this file to .env.local for local dev and set the same two
# variables in Vercel (Project → Settings → Environment Variables).
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

### `README.md` — append sections

Add after the existing "Local setup" section (wording can be tightened at
implementation time, but cover exactly these):

```markdown
## Database & security

- Postgres on Supabase with Row Level Security enabled on every table
  (`profiles`, `games`, `game_participants`).
- Sensitive actions like join/leave, roster reads, and attendance updates run
  through security-definer RPC functions. Game cancellation is protected by RLS
  policies on the games table.
- User-facing errors are sanitized to a conservative allowlist; raw database
  messages are never shown.

## Deploying (Vercel + Supabase)

1. Create a Supabase project and apply the migrations in
   `supabase/migrations/` (001–010, in order).
2. In Supabase → Auth → URL Configuration, set the Site URL and Additional
   Redirect URLs to your local (`http://localhost:3000`) and production
   (`https://<your-app>.vercel.app`) URLs.
3. Import the repo into Vercel (framework auto-detected as Next.js).
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   to the Vercel project's environment variables.
5. Deploy, then run the smoke test (load `/`, sign up, hit a protected route).

## Demo

Live demo: <!-- add Vercel URL -->

<!-- screenshots: dashboard, game detail, roster, attendance manager -->

Suggested review flow: sign up → complete profile → browse games → create a
game → join a game → view the roster → (as host) mark attendance → view your
show-up rate and past games on the dashboard.
```

## Files likely to change

Docs/config only — **no app code, no migrations, no schema:**

- `.gitignore` — add `!.env.example`.
- `.env.example` — new, committed.
- `README.md` — add Database & security, Deploying, and Demo sections.

(Plus the external, non-repo work: Supabase dashboard config and Vercel project
setup, captured as the checklists above.)

## Out of scope

- Maps, messaging, notifications, payments, AI matchmaking.
- Any major UI redesign.
- New database schema or migrations — **none required**; the inspection found no
  deployment blocker that needs a schema change. (If applying migrations to a
  fresh project surfaces a genuine ordering/permissions blocker, that becomes an
  in-scope fix; nothing in the current code indicates one.)
- New dependencies (`vercel.json`, analytics, logging services, CI config) —
  Vercel's defaults cover this MVP.
- Custom domain, preview-environment gating, rate limiting, monitoring/Sentry.
- Server-side structured logging beyond the existing `console.error`.
```
