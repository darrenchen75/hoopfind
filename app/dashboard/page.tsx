import Link from "next/link";
import GameCard from "@/components/game-card";
import SiteHeader from "@/components/site-header";
import { fetchPublicGames } from "@/lib/games";
import type { PickupGame } from "@/lib/types";

const playerName = "Darren";

export default async function DashboardPage() {
  const { games: recommendedGames, error } = await fetchPublicGames(3);

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

        <div className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Recommended games</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Runs that fit your skill level and schedule.
          </p>

          {error ? (
            <p className="mt-6 rounded-xl border border-red-900 bg-red-950/50 p-6 text-zinc-300">
              We couldn&apos;t load games right now. Please try again later.
            </p>
          ) : recommendedGames.length === 0 ? (
            <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-300">
              No public games yet. Be the first to post a run.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recommendedGames.map((game: PickupGame) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Joined games</h2>
          <p className="mt-1 text-sm text-zinc-400">Games you&apos;re already in on.</p>

          <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-300">
            You haven&apos;t joined any games yet. Browse public runs to find one.
          </p>
        </div>
      </section>
    </main>
  );
}
