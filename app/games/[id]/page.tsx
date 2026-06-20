import Link from "next/link";
import { notFound } from "next/navigation";
import GameParticipationButton from "@/components/game-participation-button";
import GameRoster from "@/components/game-roster";
import HostAttendanceManager from "@/components/host-attendance-manager";
import MatchLabel from "@/components/match-label";
import SiteHeader from "@/components/site-header";
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
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <SiteHeader />

        <div className="mt-12 max-w-3xl">
          <Link
            href="/games"
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            ← Back to games
          </Link>

          <div className="mt-6 flex items-start justify-between gap-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              {game.title}
            </h1>
            <span className="mt-2 shrink-0 rounded-full border border-zinc-700 px-3 py-1 text-sm font-medium text-zinc-300">
              {game.gameType}
            </span>
          </div>

          <p className="mt-3 text-lg text-zinc-300">
            {game.locationName} · {game.area}
          </p>

          <p className="mt-2 text-base font-medium text-orange-400">
            {game.dateTimeDisplay}
          </p>

          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Your match
            </p>
            <MatchLabel match={match} />
          </div>

          <div className="mt-8">
            <GameParticipationButton
              gameId={game.id}
              isAuthenticated={participation.isAuthenticated}
              status={participation.status}
              participationError={participation.error}
              currentPlayers={game.currentPlayers}
              maxPlayers={game.maxPlayers}
              hasStarted={hasStarted}
            />
          </div>

          <dl className="mt-10 grid gap-x-6 gap-y-6 border-t border-zinc-800 pt-8 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-zinc-500">Players</dt>
              <dd className="mt-1 text-lg text-zinc-100">
                {game.currentPlayers}/{game.maxPlayers}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-zinc-500">Competitiveness</dt>
              <dd className="mt-1 text-lg text-zinc-100">
                {game.competitiveness}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-zinc-500">Game type</dt>
              <dd className="mt-1 text-lg text-zinc-100">{game.gameType}</dd>
            </div>

            <div>
              <dt className="text-sm text-zinc-500">Desired skill range</dt>
              <dd className="mt-1 text-lg text-zinc-100">
                {game.skillRange.min} – {game.skillRange.max}
              </dd>
            </div>
          </dl>

          <div className="mt-8 border-t border-zinc-800 pt-8">
            <h2 className="text-sm text-zinc-500">Notes</h2>
            <p className="mt-2 text-base leading-7 text-zinc-300">
              {game.notes}
            </p>
          </div>

          <div className="mt-8 border-t border-zinc-800 pt-8">
            <h2 className="text-lg font-semibold tracking-tight">Player roster</h2>
            <GameRoster access={rosterAccess} roster={roster} error={rosterError} />
          </div>

          {isCreator && (
            <div className="mt-8 border-t border-zinc-800 pt-8">
              <h2 className="text-lg font-semibold tracking-tight">
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