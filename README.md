# HoopFind
Skill-based pickup basketball discovery. HoopFind helps players find pickup
runs that actually match their skill level, competitiveness, location, and
availability; rather than just going to the nearest court and hoping for the best.

## Tech stack
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**

## Prototype features
The current prototype is a clickable, frontend-only walkthrough:
- **Home (`/`)** — landing page with overview and calls to action.
- **Browse games (`/games`)** — grid of public pickup runs.
- **Game detail (`/games/[id]`)** — run details, a skill-match label, and a
  joined-players / attendance preview.
- **Dashboard (`/dashboard`)** — recommended and joined games for a sample player.
- **Create game (`/games/new`)** — static form for posting a run.
- **Profile setup (`/profile/setup`)** — static form for building a player profile.

## Local setup
Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Other scripts:
```bash
npm run build
npm start
npm run lint
```

## Milestone 1 note
This is a **static prototype**. All content is driven by fake/static data
(`lib/fake-data.ts`) and the forms do not submit anywhere. There is no auth,
database, or server-side persistence yet. Those will arrive in later milestones.