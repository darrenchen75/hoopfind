import Link from "next/link";

import type { PickupGame } from "@/lib/types";

export default function GameCard({ game }: { game: PickupGame }) {
  return (
    <Link
      href={`/games/${game.id}`}
      className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition hover:border-zinc-600 hover:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-white group-hover:text-orange-400">
          {game.title}
        </h2>
        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300">
          {game.gameType}
        </span>
      </div>

      <p className="mt-1 text-sm text-zinc-400">
        {game.locationName} · {game.area}
      </p>

      <p className="mt-4 text-sm font-medium text-orange-400">
        {game.dateTimeDisplay}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-zinc-500">Players</dt>
          <dd className="text-zinc-200">
            {game.currentPlayers}/{game.maxPlayers}
          </dd>
        </div>

        <div>
          <dt className="text-zinc-500">Competitiveness</dt>
          <dd className="text-zinc-200">{game.competitiveness}</dd>
        </div>

        <div className="col-span-2">
          <dt className="text-zinc-500">Skill range</dt>
          <dd className="text-zinc-200">
            {game.skillRange.min} – {game.skillRange.max}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-sm leading-6 text-zinc-400">{game.notes}</p>
    </Link>
  );
}
