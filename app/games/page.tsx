import GameCard from "@/components/game-card";
import SiteHeader from "@/components/site-header";
import { fakeGames } from "@/lib/fake-data";

export default function GamesPage() {
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

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {fakeGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>
    </main>
  );
}
