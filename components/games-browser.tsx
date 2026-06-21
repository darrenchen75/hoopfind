"use client";

import { useState } from "react";

import GameCard from "@/components/game-card";
import {
  emptyFilters,
  filterGames,
  type FilterState,
  type GameItem,
} from "@/lib/game-filters";
import type { Competitiveness, GameType } from "@/lib/types";
import { field, label } from "@/lib/ui";

const GAME_TYPES: GameType[] = ["3v3", "4v4", "5v5", "Open Run"];
const LEVELS: Competitiveness[] = [
  "Casual",
  "Competitive",
  "Highly Competitive",
];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition ${
        active
          ? "bg-ink text-paper"
          : "border-2 border-ink text-ink hover:bg-ink hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

export default function GamesBrowser({
  items,
  canMatch,
}: {
  items: GameItem[];
  canMatch: boolean;
}) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const visible = filterGames(items, filters);

  function toggleType(type: GameType) {
    setFilters((f) => ({
      ...f,
      types: f.types.includes(type)
        ? f.types.filter((t) => t !== type)
        : [...f.types, type],
    }));
  }

  function toggleLevel(level: Competitiveness) {
    setFilters((f) => ({
      ...f,
      levels: f.levels.includes(level)
        ? f.levels.filter((l) => l !== level)
        : [...f.levels, level],
    }));
  }

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 border-2 border-ink bg-paper p-5">
        <div>
          <span className={label}>Type</span>
          <div className="flex flex-wrap gap-2">
            {GAME_TYPES.map((type) => (
              <FilterChip
                key={type}
                active={filters.types.includes(type)}
                onClick={() => toggleType(type)}
              >
                {type}
              </FilterChip>
            ))}
          </div>
        </div>

        <div>
          <span className={label}>Level</span>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((level) => (
              <FilterChip
                key={level}
                active={filters.levels.includes(level)}
                onClick={() => toggleLevel(level)}
              >
                {level}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {canMatch && (
            <FilterChip
              active={filters.goodFitOnly}
              onClick={() =>
                setFilters((f) => ({ ...f, goodFitOnly: !f.goodFitOnly }))
              }
            >
              Good Fit only
            </FilterChip>
          )}
          <input
            type="text"
            value={filters.area}
            onChange={(e) =>
              setFilters((f) => ({ ...f, area: e.target.value }))
            }
            placeholder="Search area or location"
            aria-label="Search area or location"
            className={`${field} sm:max-w-xs`}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-10 border-2 border-ink bg-paper p-6">
          <p className="text-muted">No games match your filters.</p>
          <button
            type="button"
            onClick={() => setFilters(emptyFilters)}
            className="mt-4 text-sm font-bold uppercase tracking-wide text-vermilion-ink underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ game, match }) => (
            <GameCard key={game.id} game={game} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
