import Link from "next/link";
import GameCard from "@/components/game-card";
import SiteHeader from "@/components/site-header";
import { fetchPublicGames } from "@/lib/games";
import { getCurrentProfile } from "@/lib/profiles";

export default async function DashboardPage() {
  const { games: recommendedGames, error } = await fetchPublicGames(3);
  const profile = await getCurrentProfile();
  const displayName = profile?.displayName;

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
              Welcome back{displayName ? `, ${displayName}` : ""}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-300">
              Browse upcoming public runs and the games you&apos;ve joined.
            </p>
          </div>

          <Link
            href="/games/new"
            className="shrink-0 rounded-full bg-orange-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-orange-400"
          >
            Create a game
          </Link>
        </div>

        {!profile?.skillLevel && (
          <p className="mt-8 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-zinc-300">
            Add your skill level in your{" "}
            <Link
              href="/profile/setup"
              className="font-semibold text-orange-400 hover:text-orange-300"
            >
              player profile
            </Link>{" "}
            to get better game matching.
          </p>
        )}

        <div className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Upcoming games</h2>
          <p className="mt-1 text-sm text-zinc-400">
            The next public pickup runs available on HoopFind.
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
              {recommendedGames.map((game) => (
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
