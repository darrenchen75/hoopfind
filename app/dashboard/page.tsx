import Link from "next/link";
import GameCard from "@/components/game-card";
import SiteHeader from "@/components/site-header";
import {
  fetchCurrentUserHostedGames,
  fetchCurrentUserJoinedGames,
  fetchCurrentUserPastHostedGames,
  fetchPublicGames,
} from "@/lib/games";
import { getCurrentProfile, isProfileComplete } from "@/lib/profiles";

export default async function DashboardPage() {
  const { games: recommendedGames, error } = await fetchPublicGames(3);
  const { games: joinedGames, error: joinedError } = await fetchCurrentUserJoinedGames();
  const { games: hostedGames, error: hostedError } = await fetchCurrentUserHostedGames();
  const { games: pastHostedGames, error: pastHostedError } =
    await fetchCurrentUserPastHostedGames();
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

        {!isProfileComplete(profile) && (
          <p className="mt-8 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-zinc-300">
            Complete your{" "}
            <Link
              href="/profile/setup"
              className="font-semibold text-orange-400 hover:text-orange-300"
            >
              player profile
            </Link>{" "}
            to improve game matching.
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

          {joinedError ? (
            <p className="mt-6 rounded-xl border border-red-900 bg-red-950/50 p-6 text-zinc-300">
              We couldn&apos;t load your joined games right now. Please try again later.
            </p>
          ) : joinedGames.length === 0 ? (
            <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-300">
              You haven&apos;t joined any games yet.{" "}
              <Link
                href="/games"
                className="font-semibold text-orange-400 hover:text-orange-300"
              >
                Browse public runs
              </Link>{" "}
              to find one.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {joinedGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Hosted games</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Upcoming pickup runs you organized.
          </p>

          {hostedError ? (
            <p className="mt-6 rounded-xl border border-red-900 bg-red-950/50 p-6 text-zinc-300">
              We couldn&apos;t load your hosted games right now. Please try again later.
            </p>
          ) : hostedGames.length === 0 ? (
            <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-300">
              You haven&apos;t created an upcoming game yet.{" "}
              <Link
                href="/games/new"
                className="font-semibold text-orange-400 hover:text-orange-300"
              >
                Create a game
              </Link>{" "}
              to organize a run.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {hostedGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>

        {(pastHostedError || pastHostedGames.length > 0) && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight">Past hosted games</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Review completed runs and manage attendance.
            </p>

            {pastHostedError ? (
              <p className="mt-6 rounded-xl border border-red-900 bg-red-950/50 p-6 text-zinc-300">
                We couldn&apos;t load your past hosted games right now. Please try again later.
              </p>
            ) : (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pastHostedGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
