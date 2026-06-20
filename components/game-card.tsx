import Link from "next/link";

import type { PickupGame } from "@/lib/types";

function SpotsBadge({ spotsLeft }: { spotsLeft: number }) {
  if (spotsLeft <= 0) {
    return (
      <span className="shrink-0 border border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-muted">
        Full
      </span>
    );
  }
  if (spotsLeft <= 3) {
    return (
      <span className="shrink-0 bg-vermilion px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink">
        {spotsLeft} left
      </span>
    );
  }
  return (
    <span className="shrink-0 border border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink">
      {spotsLeft} open
    </span>
  );
}

export default function GameCard({ game }: { game: PickupGame }) {
  const spotsLeft = Math.max(0, game.maxPlayers - game.currentPlayers);
  const fillPct =
    game.maxPlayers > 0
      ? Math.min(100, Math.round((game.currentPlayers / game.maxPlayers) * 100))
      : 0;

  return (
    <Link
      href={`/games/${game.id}`}
      className="group flex flex-col border-2 border-ink bg-paper p-5 transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermilion motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-paper">
          {game.gameType}
        </span>
        <SpotsBadge spotsLeft={spotsLeft} />
      </div>

      <h2 className="mt-4 font-display text-3xl font-black uppercase leading-[0.95]">
        {game.title}
      </h2>

      <p className="mt-1 text-sm font-semibold text-vermilion-ink">
        {game.dateTimeDisplay}
      </p>
      <p className="mt-1 text-sm text-muted">
        {game.locationName} · {game.area}
      </p>

      <p className="mt-3 font-serif text-base italic leading-snug text-muted line-clamp-1">
        {game.notes}
      </p>

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-baseline justify-between text-xs font-bold uppercase tracking-wide text-muted">
          <span>Players</span>
          <span className="text-ink">
            {game.currentPlayers}/{game.maxPlayers}
          </span>
        </div>
        <div className="mt-2 h-2 w-full bg-line" aria-hidden>
          <div className="h-full bg-vermilion" style={{ width: `${fillPct}%` }} />
        </div>

        <dl className="mt-3 flex items-baseline justify-between text-xs font-bold uppercase tracking-wide">
          <dt className="text-muted">Skill</dt>
          <dd className="text-ink">
            {game.skillRange.min}–{game.skillRange.max}
          </dd>
        </dl>
        <dl className="mt-1.5 flex items-baseline justify-between text-xs font-bold uppercase tracking-wide">
          <dt className="text-muted">Speed</dt>
          <dd className="text-ink">{game.competitiveness}</dd>
        </dl>
      </div>
    </Link>
  );
}
