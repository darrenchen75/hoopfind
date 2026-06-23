import { describe, it, expect } from "vitest";
import { filterGames, emptyFilters, type GameItem } from "./game-filters";
import type { Competitiveness, GameType, PickupGame } from "@/lib/types";
import type { MatchLabel } from "@/lib/match";

function makeItem(overrides: {
  id?: string;
  gameType?: GameType;
  competitiveness?: Competitiveness;
  area?: string;
  locationName?: string;
  label?: MatchLabel;
}): GameItem {
  const game: PickupGame = {
    id: overrides.id ?? "1",
    creatorId: "c",
    title: "Run",
    locationName: overrides.locationName ?? "Lincoln Park",
    area: overrides.area ?? "North Side",
    startsAt: "2026-06-21T09:00:00Z",
    dateTimeDisplay: "Sat, Jun 21 · 9:00 AM",
    gameType: overrides.gameType ?? "5v5",
    currentPlayers: 0,
    maxPlayers: 10,
    competitiveness: overrides.competitiveness ?? "Casual",
    skillRange: { min: "Beginner", max: "Elite" },
    notes: "",
    isCanceled: false,
  };
  return { game, match: { label: overrides.label ?? "Good Fit", reason: "" } };
}

describe("filterGames", () => {
  const items = [
    makeItem({ id: "a", gameType: "3v3", competitiveness: "Casual", area: "North Side", label: "Good Fit" }),
    makeItem({ id: "b", gameType: "5v5", competitiveness: "Competitive", area: "South Loop", label: "Might Be Too Competitive" }),
    makeItem({ id: "c", gameType: "5v5", competitiveness: "Highly Competitive", locationName: "Westside Gym", area: "West Town", label: "Good Fit" }),
  ];

  it("returns all items when filters are empty", () => {
    expect(filterGames(items, emptyFilters)).toHaveLength(3);
  });

  it("keeps only the selected game type", () => {
    const result = filterGames(items, { ...emptyFilters, types: ["3v3"] });
    expect(result.map((i) => i.game.id)).toEqual(["a"]);
  });

  it("ORs multiple selected types together", () => {
    const result = filterGames(items, { ...emptyFilters, types: ["3v3", "5v5"] });
    expect(result.map((i) => i.game.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps only the selected competitiveness", () => {
    const result = filterGames(items, { ...emptyFilters, levels: ["Competitive"] });
    expect(result.map((i) => i.game.id)).toEqual(["b"]);
  });

  it("keeps only Good Fit matches when goodFitOnly is set", () => {
    const result = filterGames(items, { ...emptyFilters, goodFitOnly: true });
    expect(result.map((i) => i.game.id)).toEqual(["a", "c"]);
  });

  it("matches area case-insensitively against area and locationName", () => {
    expect(filterGames(items, { ...emptyFilters, area: "south" }).map((i) => i.game.id)).toEqual(["b"]);
    expect(filterGames(items, { ...emptyFilters, area: "WESTSIDE" }).map((i) => i.game.id)).toEqual(["c"]);
  });

  it("ignores surrounding whitespace in the area query", () => {
    expect(filterGames(items, { ...emptyFilters, area: "  north  " }).map((i) => i.game.id)).toEqual(["a"]);
  });

  it("combines dimensions with AND", () => {
    const result = filterGames(items, {
      ...emptyFilters,
      types: ["5v5"],
      goodFitOnly: true,
    });
    expect(result.map((i) => i.game.id)).toEqual(["c"]);
  });
});
