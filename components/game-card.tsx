import Link from "next/link";

import MatchLabel from "@/components/match-label";
import { getMatch } from "@/lib/match";
import type { PickupGame, PlayerProfile } from "@/lib/types";

export default function GameCard({
  game,
  profile,
}: {
  game: PickupGame;
  profile?: PlayerProfile | null;
}) {
  // Only show a match badge when the player's skill level is known; otherwise
  // it would render a "Missing Profile Info" chip on every card.
  const match = profile?.skillLevel ? getMatch(profile, game) : null;

  return (
    <Link
      href={`/games/${game.id}`}
      className="group flex flex-col border-2 border-ink bg-paper p-5 transition hover:bg-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-black uppercase leading-none">
          {game.title}
        </h2>
        <span className="shrink-0 border border-ink px-2 py-1 text-xs font-bold uppercase tracking-wide">
          {game.gameType}
        </span>
      </div>

      <p className="mt-2 text-sm text-muted">
        {game.locationName} · {game.area}
      </p>

      {match && (
        <div className="mt-3">
          <MatchLabel match={match} compact />
        </div>
      )}

      <p className="mt-3 text-sm font-semibold text-vermilion-ink">
        {game.dateTimeDisplay}
      </p>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-3 text-sm">
        <div className="flex gap-1.5">
          <dt className="text-muted">Players</dt>
          <dd className="font-semibold">
            {game.currentPlayers}/{game.maxPlayers}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted">Speed</dt>
          <dd className="font-semibold">{game.competitiveness}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-muted">Skill</dt>
          <dd className="font-semibold">
            {game.skillRange.min}–{game.skillRange.max}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-sm leading-6 text-muted">{game.notes}</p>
    </Link>
  );
}
