import GameCard from "@/components/game-card";
import SiteHeader from "@/components/site-header";
import { fetchPublicGames } from "@/lib/games";

export default async function GamesPage() {
  const { games, error } = await fetchPublicGames();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
            Browse games
          </p>

          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Public pickup runs
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
            Find a run that fits your skill level, competitiveness, and schedule.
          </p>
        </div>

        {error ? (
          <p className="mt-10 rounded-xl border border-red-900 bg-red-950/50 p-6 text-zinc-300">
            We couldn&apos;t load games right now. Please try again later.
          </p>
        ) : games.length === 0 ? (
          <p className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-300">
            No public games yet. Be the first to post a run.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
