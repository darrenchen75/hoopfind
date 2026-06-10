import Link from "next/link";
import GameCard from "@/components/game-card";
import SiteHeader from "@/components/site-header";
import { fakeGames } from "@/lib/fake-data";

const playerName = "Darren";
const recommendedGames = fakeGames.slice(0, 3);
const joinedGames = fakeGames.slice(0, 2);

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
              Dashboard
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Welcome back, {playerName}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
              Here are runs picked for you and the games you&apos;ve joined.
            </p>
          </div>

          <Link
            href="/games/new"
            className="shrink-0 rounded-full bg-orange-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-orange-400"
          >
            Create a game
          </Link>
        </div>

        <DashboardSection
          title="Recommended games"
          subtitle="Runs that fit your skill level and schedule."
          games={recommendedGames}
        />

        <DashboardSection
          title="Joined games"
          subtitle="Games you're already in on."
          games={joinedGames}
        />
      </section>
    </main>
  );
}

function DashboardSection({
  title,
  subtitle,
  games,
}: {
  title: string;
  subtitle: string;
  games: typeof fakeGames;
}) {
  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}