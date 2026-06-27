import Link from "next/link";
import GameCard from "@/components/game-card";
import EmptyState from "@/components/empty-state";
import SectionHeading from "@/components/section-heading";
import SiteHeader from "@/components/site-header";
import {
  fetchCurrentUserHostedGames,
  fetchCurrentUserJoinedGames,
  fetchCurrentUserPastHostedGames,
  fetchCurrentUserPastJoinedGames,
  fetchPublicGames,
} from "@/lib/games";
import { getCurrentProfile, isProfileComplete } from "@/lib/profiles";
import { getCurrentUserAttendanceCounts } from "@/lib/participation";
import { reliability } from "@/lib/reliability";
import { getMatch } from "@/lib/match";
import { btnPrimary, card } from "@/lib/ui";

const loadError = "mt-6 border-2 border-vermilion-ink bg-vermilion-ink/10 p-6 text-vermilion-ink";
const grid = "mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

export default async function DashboardPage() {
  const [
    { games: recommendedGames, error },
    { games: joinedGames, error: joinedError },
    { games: hostedGames, error: hostedError },
    { games: pastHostedGames, error: pastHostedError },
    profile,
    { games: pastJoinedGames, error: pastJoinedError },
    attendance,
  ] = await Promise.all([
    fetchPublicGames(3),
    fetchCurrentUserJoinedGames(),
    fetchCurrentUserHostedGames(),
    fetchCurrentUserPastHostedGames(),
    getCurrentProfile(),
    fetchCurrentUserPastJoinedGames(),
    getCurrentUserAttendanceCounts(),
  ]);

  const displayName = profile?.displayName;
  const { pct, decided } = reliability(attendance.attended, attendance.missed);
  const showUp = attendance.error
    ? null
    : decided === 0
      ? "New"
      : `${pct}% · ${attendance.attended}/${decided} marked games`;
  const profileComplete = isProfileComplete(profile);

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
              Your upcoming runs, the games you host, and public pickup near you.
            </p>
          </div>

          <Link href="/games/new" className={`shrink-0 ${btnPrimary}`}>
            Create a game
          </Link>
        </div>

        {(showUp || !profileComplete) && (
          <div className={`mt-8 ${card}`}>
            {showUp && (
              <>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
                  Your show-up rate
                </p>
                <p className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-ink">
                  {showUp}
                </p>
              </>
            )}
            {!profileComplete && (
              <p
                className={`text-sm text-ink ${showUp ? "mt-3 border-t border-line pt-3" : ""}`}
              >
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
          </div>
        )}

        <div className="mt-12">
          <SectionHeading title="Joined games" subtitle="Games you're already in on." />
          {joinedError ? (
            <p className={loadError}>
              We couldn&apos;t load your joined games right now. Please try again later.
            </p>
          ) : joinedGames.length === 0 ? (
            <EmptyState
              message="You haven't joined any games yet."
              cta={{ href: "/games", label: "Browse public runs" }}
            />
          ) : (
            <div className={grid}>
              {joinedGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-12">
          <SectionHeading title="Hosted games" subtitle="Upcoming pickup runs you organized." />
          {hostedError ? (
            <p className={loadError}>
              We couldn&apos;t load your hosted games right now. Please try again later.
            </p>
          ) : hostedGames.length === 0 ? (
            <EmptyState
              message="You haven't created a game yet."
              cta={{ href: "/games/new", label: "Create a game" }}
            />
          ) : (
            <div className={grid}>
              {hostedGames.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-12">
          <SectionHeading
            title="Discover public runs"
            subtitle="The next public pickup runs available on HoopFind."
            link={{ href: "/games", label: "Browse all" }}
          />
          {error ? (
            <p className={loadError}>
              We couldn&apos;t load games right now. Please try again later.
            </p>
          ) : recommendedGames.length === 0 ? (
            <EmptyState
              message="No public games yet. Be the first to post a run."
              cta={{ href: "/games/new", label: "Create a game" }}
            />
          ) : (
            <div className={grid}>
              {recommendedGames.map((game) => (
                <GameCard key={game.id} game={game} match={getMatch(profile, game)} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-16 border-t border-line pt-10">
          <h2 className="font-display text-lg font-semibold uppercase tracking-tight text-muted">
            History
          </h2>

          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-wide text-muted">
              Games you played
            </p>
            {pastJoinedError ? (
              <p className={loadError}>
                We couldn&apos;t load your past games right now. Please try again later.
              </p>
            ) : pastJoinedGames.length === 0 ? (
              <EmptyState message="No past games yet — they'll show up here after you play." />
            ) : (
              <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pastJoinedGames.map(({ game, status }) => (
                  <div key={game.id} className="flex flex-col gap-2">
                    <span className="self-start border border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink">
                      {status === "attended"
                        ? "Played"
                        : status === "missed"
                          ? "Missed"
                          : "Not marked"}
                    </span>
                    <GameCard game={game} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {(pastHostedError || pastHostedGames.length > 0) && (
            <div className="mt-8">
              <p className="text-sm font-bold uppercase tracking-wide text-muted">
                Games you hosted
              </p>
              {pastHostedError ? (
                <p className={loadError}>
                  We couldn&apos;t load your past hosted games right now. Please try again later.
                </p>
              ) : (
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {pastHostedGames.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
