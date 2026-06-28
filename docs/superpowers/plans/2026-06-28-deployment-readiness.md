# Deployment Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make HoopFind deploy-ready on Vercel + Supabase via a committed `.env.example`, an un-ignore in `.gitignore`, and README deployment/security/demo sections — no app code or schema changes.

**Architecture:** Two tiny repo changes (env-var discoverability, README polish), then a human-run deployment runbook (Supabase dashboard + Vercel + live QA) that no subagent can perform. Everything the inspection found is already production-safe; this only closes config/docs gaps.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, Supabase. Spec: `docs/superpowers/specs/2026-06-28-deployment-readiness-design.md`.

## Global Constraints

Copied from the spec — every task is bound by these:

- **No app code changes, no migrations, no schema changes, no new dependencies.** Repo changes are limited to `.gitignore`, `.env.example` (new), and `README.md`.
- **Only two env vars exist, both public:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase **publishable** key — not the legacy anon key, not the service-role key). Do **not** introduce a service-role or any server-only secret.
- **No real secret may be committed.** Only `.env.example` (placeholder values) is tracked; `.env.local` stays untracked.
- **Security wording is exact:** join/leave, roster reads, and attendance updates use `security definer` RPCs; **game cancellation is a direct `games` table update protected by RLS / the hosted-game update policy — NOT an RPC.**
- **Commit messages:** lowercase imperative, short. **Never** a `Co-Authored-By` / AI-credit line.
- **Verification gate per task:** `npm run lint` clean, `npm run build` clean (doc/config changes must not break the build), plus the task's specific check.
- Work on branch `feature/deployment-readiness` (already cut from `main`; the spec is committed there). Stage only the files each task names — unrelated untracked files (`.claude/`, `CLAUDE.md`) stay out of commits.

---

## File Structure

| File | Responsibility | New? |
|------|----------------|------|
| `.gitignore` | un-ignore `.env.example` so it can be committed | modify |
| `.env.example` | canonical list of the two public env vars, placeholder values | create |
| `README.md` | add Database & security, Deploying, and Demo sections | modify |

The Supabase/Vercel/live-QA work is operator runbook (below), not file tasks.

---

## Task 1: Env-var discoverability (`.gitignore` + `.env.example`)

**Files:**
- Modify: `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Consumes: nothing.
- Produces: a committed `.env.example` documenting `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

- [ ] **Step 1: Un-ignore `.env.example` in `.gitignore`**

The current env block (around lines 33–34) is:

```gitignore
# env files (can opt-in for committing if needed)
.env*
```

Replace it with:

```gitignore
# env files (can opt-in for committing if needed)
.env*
!.env.example
```

- [ ] **Step 2: Create `.env.example`**

Create `.env.example` with placeholder (non-secret) values:

```bash
# Supabase project credentials — both are public, client-safe keys.
# Copy this file to .env.local for local dev and set the same two
# variables in Vercel (Project → Settings → Environment Variables).
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

- [ ] **Step 3: Verify the un-ignore worked**

Run: `git check-ignore .env.example; echo "exit=$?"`
Expected: prints nothing and `exit=1` (i.e. `.env.example` is **no longer ignored**).

Run: `git check-ignore .env.local; echo "exit=$?"`
Expected: prints `.env.local` and `exit=0` (i.e. `.env.local` is **still ignored** — no real secret becomes trackable).

- [ ] **Step 4: Lint + build sanity**

Run: `npm run lint` → clean.
Run: `npm run build` → compiles (config change must not break the build).

- [ ] **Step 5: Commit, then confirm the secret check**

```bash
git add .gitignore .env.example
git commit -m "add env example and un-ignore it"
```

Then run: `git ls-files | grep -i env`
Expected: returns **only** `.env.example`. Confirm `.env.local` is **not** in the output. (No real secret-bearing env file is tracked.)

---

## Task 2: README deployment, security & demo sections

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the `.env.example` from Task 1 (referenced in setup).
- Produces: nothing for later tasks.

Keep every existing README section. **Append** the three sections below after the existing "Other scripts" block at the end of the file.

- [ ] **Step 1: Append the new sections to `README.md`**

Add at the end of `README.md`:

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

- [ ] **Step 2: Verify the security wording is correct**

Run: `grep -n "cancellation" README.md`
Expected: the only match states cancellation is **protected by RLS policies** (NOT a security-definer RPC). If any line implies cancellation is an RPC, fix it.

- [ ] **Step 3: Lint + build sanity**

Run: `npm run lint` → clean.
Run: `npm run build` → compiles.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "document deployment and security in readme"
```

---

## App readiness gate (run once before deploying)

Not a file task — run these and confirm green before the operator runbook:

- [ ] `npm run test` → Vitest green (`lib/*.test.ts`).
- [ ] `npm run lint` → clean.
- [ ] `npm run build` → compiles.
- [ ] `git ls-files | grep -i env` → only `.env.example` (secret check).

---

## Operator deployment runbook (human-executed)

These steps configure external services and a live deployment; no subagent can
perform them. Execute in order after Tasks 1–2 are merged.

### Supabase

- [ ] Create (or reuse) the Supabase project.
- [ ] Apply migrations **001–010 in order** (SQL editor or `supabase db push`).
- [ ] Confirm **RLS enabled** on `profiles`, `games`, `game_participants` (Auth → Policies).
- [ ] Confirm RPC functions exist (Database → Functions): `join_game`, `leave_game`, `get_game_roster`, `get_host_game_participants`, `set_participant_attendance`. (Cancellation is **not** an RPC — it's a direct `games` update under RLS.)
- [ ] No storage buckets (not used).
- [ ] Auth → URL Configuration: Site URL + Additional Redirect URLs include `http://localhost:3000` and the Vercel production URL.
- [ ] Email auth (MVP): recommend disabling "Confirm email" for a frictionless demo signup; otherwise document the confirm step.

### Vercel

- [ ] Import the GitHub repo; framework preset = Next.js (auto-detected).
- [ ] Build command default `next build`; install default `npm install`; no `vercel.json`.
- [ ] Node 20+.
- [ ] Add the two `NEXT_PUBLIC_*` env vars (Production + Preview).
- [ ] Deploy; copy the production URL back into Supabase Auth Site/Redirect URLs.

### Post-deploy smoke test + manual QA

Run on the **live deployment**, desktop + ~360px mobile:

- [ ] Load `/`, `/games`; sign up / log in; protected route signed-out (`/dashboard` → `/login`), then signed-in loads.
- [ ] **Auth** — wrong password → "Invalid login credentials"; existing email signup → "account exists" hint.
- [ ] **Profile setup** — save persists; protected when signed out.
- [ ] **Create game** — valid succeeds; invalid input → specific validation message.
- [ ] **Browse games** — grid, filters, empty state.
- [ ] **Game detail** — info hierarchy, skill-match label, players/skill/competitiveness.
- [ ] **Join / leave** — counts update; full → "This game is full"; leave after start blocked.
- [ ] **Edit / cancel (host)** — edit prefills in the game timezone; cancel banner; controls hidden after start.
- [ ] **Roster permissions** — logged-out/non-member can't see roster; member/host can.
- [ ] **Attendance (host)** — attended/missed toggle; `aria-pressed` reflects state; only after start.
- [ ] **Show-up rate** — dashboard summary + roster badges correct.
- [ ] **Past games** — joined + hosted history populate.
- [ ] **Timezone-safe edit** — create a game, confirm displayed time matches what was entered; open edit, save without changing the time, confirm it does not shift on the deployed server. (Advanced, if practical: repeat with browser/OS tz changed.)
- [ ] **Mobile** — no horizontal scroll at ~360px; 44px touch targets; titles wrap.
- [ ] **Safe error handling** — force a system error → generic safe message, no raw Postgres text.

### Demo data

- [ ] One demo signup; complete a mid-range profile (skill, position, play style, area, travel distance).
- [ ] Create 3–4 sample games: a competitive near-future run, a casual one, a different-area small-cap run (to show "spots left"/full), and one past-start game (mark attendance after start) so show-up rate + Past games populate.

---

## Self-Review (against the spec)

- **§1 Environment variables** → Task 1 (`.env.example` + `.gitignore` un-ignore + secret check). ✓
- **§2 Supabase checklist** → operator runbook (migrations 001–010, RLS, RPCs, no storage, redirect URLs, email auth). Cancellation correctly NOT listed as an RPC. ✓
- **§3 Vercel checklist** → operator runbook (framework, build/install defaults, env vars, redirect URL, smoke test). ✓
- **§4 App readiness** → "App readiness gate" (test/lint/build, secret check); no user-facing debug logs / safe errors / timezone covered in QA. ✓
- **§5 README polish** → Task 2 (Database & security, Deploying, Demo + screenshots placeholder); security wording matches spec exactly. ✓
- **§6 Demo data / flow** → operator runbook demo section + README demo flow. ✓
- **§7 Manual QA** → operator runbook QA checklist (corrected timezone + competitiveness wording). ✓
- **§8 Out of scope** → Global Constraints (no schema/migration/dependency/feature/UI changes). ✓

No placeholders other than the intentional README screenshot/URL placeholders (the deliverable). Env var names consistent across both tasks. Security wording (cancellation = RLS, not RPC) consistent in spec, Task 2, and runbook.
```
