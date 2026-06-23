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
