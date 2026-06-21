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
import { getMatch } from "@/lib/match";
import { btnPrimary } from "@/lib/ui";

export default async function DashboardPage() {
  const [
    { games: recommendedGames, error },
    { games: joinedGames, error: joinedError },
    { games: hostedGames, error: hostedError },
    { games: pastHostedGames, error: pastHostedError },
    profile,
  ] = await Promise.all([
    fetchPublicGames(3),
    fetchCurrentUserJoinedGames(),
    fetchCurrentUserHostedGames(),
    fetchCurrentUserPastHostedGames(),
    getCurrentProfile(),
  ]);
  const displayName = profile?.displayName;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-vermilion-ink">
              Dashboard
            </p>
            <h1 className="font-display text-4xl font-bold uppercase leading-tight tracking-tight md:text-5xl">
              Welcome back{displayName ? `, ${displayName}` : ""}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
              Browse upcoming public runs and the games you&apos;ve joined.
            </p>
          </div>

          <Link
            href="/games/new"
            className={`shrink-0 ${btnPrimary}`}
          >
            Create a game
          </Link>
        </div>

        {!isProfileComplete(profile) && (
          <p className="mt-8 border-2 border-vermilion bg-vermilion/10 p-4 text-sm text-ink">
            Complete your{" "}
            <Link
              href="/profile/setup"
              className="font-bold text-vermilion-ink hover:text-ink"
            >
              player profile
            </Link>{" "}
            to improve game matching.
          </p>
        )}

        <div className="mt-12">
          <h2 className="font-display text-2xl font-semibold uppercase tracking-tight">Upcoming games</h2>
          <p className="mt-1 text-sm text-muted">
            The next public pickup runs available on HoopFind.
          </p>

          {error ? (
            <p className="mt-6 border-2 border-vermilion-ink bg-vermilion-ink/10 p-6 text-vermilion-ink">
              We couldn&apos;t load games right now. Please try again later.
            </p>
          ) : recommendedGames.length === 0 ? (
            <p className="mt-6 border-2 border-ink bg-paper p-6 text-muted">
              No public games yet. Be the first to post a run.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recommendedGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  match={getMatch(profile, game)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-12">
          <h2 className="font-display text-2xl font-semibold uppercase tracking-tight">Joined games</h2>
          <p className="mt-1 text-sm text-muted">Games you&apos;re already in on.</p>

          {joinedError ? (
            <p className="mt-6 border-2 border-vermilion-ink bg-vermilion-ink/10 p-6 text-vermilion-ink">
              We couldn&apos;t load your joined games right now. Please try again later.
            </p>
          ) : joinedGames.length === 0 ? (
            <p className="mt-6 border-2 border-ink bg-paper p-6 text-muted">
              You haven&apos;t joined any games yet.{" "}
              <Link
                href="/games"
                className="font-bold text-vermilion-ink hover:text-ink"
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
          <h2 className="font-display text-2xl font-semibold uppercase tracking-tight">Hosted games</h2>
          <p className="mt-1 text-sm text-muted">
            Upcoming pickup runs you organized.
          </p>

          {hostedError ? (
            <p className="mt-6 border-2 border-vermilion-ink bg-vermilion-ink/10 p-6 text-vermilion-ink">
              We couldn&apos;t load your hosted games right now. Please try again later.
            </p>
          ) : hostedGames.length === 0 ? (
            <p className="mt-6 border-2 border-ink bg-paper p-6 text-muted">
              You haven&apos;t created an upcoming game yet.{" "}
              <Link
                href="/games/new"
                className="font-bold text-vermilion-ink hover:text-ink"
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
            <h2 className="font-display text-2xl font-semibold uppercase tracking-tight">Past hosted games</h2>
            <p className="mt-1 text-sm text-muted">
              Review completed runs and manage attendance.
            </p>

            {pastHostedError ? (
              <p className="mt-6 border-2 border-vermilion-ink bg-vermilion-ink/10 p-6 text-vermilion-ink">
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
