import Link from "next/link";
import { notFound } from "next/navigation";
import CancelGameButton from "@/components/cancel-game-button";
import GameParticipationButton from "@/components/game-participation-button";
import GameRoster from "@/components/game-roster";
import HostAttendanceManager from "@/components/host-attendance-manager";
import MatchLabel from "@/components/match-label";
import SiteHeader from "@/components/site-header";
import { btnPrimary } from "@/lib/ui";
import { fetchPublicGameById, isGameStarted, isUuid } from "@/lib/games";
import { getMatch } from "@/lib/match";
import { getGameParticipation } from "@/lib/participation";
import { getCurrentProfile } from "@/lib/profiles";
import { fetchGameRoster, fetchHostGameParticipants } from "@/lib/roster";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const [game, profile, participation] = await Promise.all([
    fetchPublicGameById(id),
    getCurrentProfile(),
    getGameParticipation(id),
  ]);

  if (!game) {
    notFound();
  }

  const match = getMatch(profile, game);
  const hasStarted = isGameStarted(game.startsAt);
  const isCreator =
    !!participation.userId && participation.userId === game.creatorId;
  // Creator is authorized via ownership alone, so a failed participation lookup
  // (error) only downgrades access for non-creators.
  const rosterAccess = !participation.isAuthenticated
    ? "loggedOut"
    : isCreator
      ? "authorized"
      : participation.error
        ? "error"
        : participation.status !== null
          ? "authorized"
          : "notJoined";
  const { roster, error: rosterError } =
    rosterAccess === "authorized"
      ? await fetchGameRoster(id)
      : { roster: [], error: false };
  const host = isCreator
    ? await fetchHostGameParticipants(id)
    : { participants: [], error: false };

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12 max-w-3xl">
          <Link
            href="/games"
            className="text-sm text-muted transition hover:text-ink"
          >
            ← Back to games
          </Link>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-display text-4xl font-bold uppercase leading-tight tracking-tight md:text-5xl">
              {game.title}
            </h1>
            <span className="mt-2 shrink-0 border border-ink px-3 py-1 text-sm font-bold uppercase tracking-wide">
              {game.gameType}
            </span>
          </div>

          <p className="mt-3 text-lg text-muted">
            {game.locationName} · {game.area}
          </p>

          <p className="mt-2 text-base font-semibold text-vermilion-ink">
            {game.dateTimeDisplay}
          </p>

          {game.isCanceled && (
            <p className="mt-4 border-2 border-vermilion-ink bg-vermilion-ink/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-vermilion-ink">
              Canceled by the host
            </p>
          )}

          {!game.isCanceled && hasStarted && (
            <p className="mt-4 border-2 border-ink bg-paper px-4 py-2 text-sm font-bold uppercase tracking-wide text-muted">
              This game has already started
            </p>
          )}

          <dl className="mt-8 grid gap-x-6 gap-y-6 border-t border-line pt-8 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted">Players</dt>
              <dd className="mt-1 text-lg text-ink">
                {game.currentPlayers}/{game.maxPlayers}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-muted">Competitiveness</dt>
              <dd className="mt-1 text-lg text-ink">{game.competitiveness}</dd>
            </div>

            <div>
              <dt className="text-sm text-muted">Desired skill range</dt>
              <dd className="mt-1 text-lg text-ink">
                {game.skillRange.min} – {game.skillRange.max}
              </dd>
            </div>
          </dl>

          <div className="mt-8 border-2 border-ink bg-paper p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted">
              Your match
            </p>
            <MatchLabel match={match} />
          </div>

          <div className="mt-8">
            {game.isCanceled ? (
              <p className="text-base font-medium text-muted">
                This game was canceled by the host.
              </p>
            ) : (
              <GameParticipationButton
                gameId={game.id}
                isAuthenticated={participation.isAuthenticated}
                status={participation.status}
                participationError={participation.error}
                currentPlayers={game.currentPlayers}
                maxPlayers={game.maxPlayers}
                hasStarted={hasStarted}
              />
            )}
          </div>

          {isCreator && !hasStarted && !game.isCanceled && (
            <div className="mt-6 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
              <Link href={`/games/${game.id}/edit`} className={btnPrimary}>
                Edit game
              </Link>
              <CancelGameButton gameId={game.id} />
            </div>
          )}

          {game.notes && (
            <div className="mt-8 border-t border-line pt-8">
              <h2 className="font-display text-sm uppercase text-muted">Notes</h2>
              <p className="mt-2 text-base leading-7 text-muted">{game.notes}</p>
            </div>
          )}

          <div className="mt-8 border-t border-line pt-8">
            <h2 className="font-display text-lg font-semibold uppercase tracking-tight">
              Player roster
            </h2>
            <GameRoster access={rosterAccess} roster={roster} error={rosterError} />
          </div>

          {isCreator && (
            <div className="mt-8 border-t border-line pt-8">
              <h2 className="font-display text-lg font-semibold uppercase tracking-tight">
                Attendance management
              </h2>
              <HostAttendanceManager
                gameId={game.id}
                hasStarted={hasStarted}
                participants={host.participants}
                error={host.error}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
