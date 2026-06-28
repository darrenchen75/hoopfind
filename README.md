# HoopFind

Skill-based pickup basketball discovery. HoopFind helps players find pickup
runs that match their skill level, competitiveness, location, and availability —
rather than going to the nearest court and hoping for the best.

## Tech stack

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase**

## Features

- **Home (`/`)** — landing page with overview and calls to action.
- **Sign up / Log in (`/signup`, `/login`)** — email auth via Supabase.
- **Browse games (`/games`)** — grid of public pickup runs with skill-match labels and filters.
- **Game detail (`/games/[id]`)** — run details, skill-match label, roster, and attendance.
- **Dashboard (`/dashboard`)** — recommended and joined games for the signed-in player.
- **Create game (`/games/new`)** — post a run for others to join.
- **Profile setup (`/profile/setup`)** — build a player profile to find suitable competition.

Protected routes (`/dashboard`, `/profile/setup`, `/games/new`) redirect to login when signed out.

## Local setup

Requires Node.js 20+.

Create `.env.local` with your Supabase project credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Apply the database schema by running the migrations in `supabase/migrations/`
against your Supabase project (e.g. via the Supabase SQL editor or CLI).

Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build
npm start
npm run lint
```

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

Live demo: *(link coming)*

<!-- screenshots: dashboard, game detail, roster, attendance manager -->

Suggested review flow: sign up → complete profile → browse games → create a
game → join a game → view the roster → (as host) mark attendance → view your
show-up rate and past games on the dashboard.
