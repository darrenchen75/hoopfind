import type { Competitiveness, GameType, PickupGame } from "@/lib/types";
import type { MatchResult } from "@/lib/match";

export interface GameItem {
  game: PickupGame;
  match: MatchResult;
}

export interface FilterState {
  types: GameType[];
  levels: Competitiveness[];
  goodFitOnly: boolean;
  area: string;
}

export const emptyFilters: FilterState = {
  types: [],
  levels: [],
  goodFitOnly: false,
  area: "",
};

export function filterGames(
  items: GameItem[],
  filters: FilterState,
): GameItem[] {
  const area = filters.area.trim().toLowerCase();

  return items.filter(({ game, match }) => {
    if (filters.types.length > 0 && !filters.types.includes(game.gameType)) {
      return false;
    }
    if (
      filters.levels.length > 0 &&
      !filters.levels.includes(game.competitiveness)
    ) {
      return false;
    }
    if (filters.goodFitOnly && match.label !== "Good Fit") {
      return false;
    }
    if (
      area &&
      !`${game.locationName} ${game.area}`.toLowerCase().includes(area)
    ) {
      return false;
    }
    return true;
  });
}
