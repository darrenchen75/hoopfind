import type { PickupGame, PlayerProfile, SkillLevel } from "@/lib/types";

export type MatchLabel =
  | "Good Fit"
  | "Might Be Too Competitive"
  | "Might Be Too Casual"
  | "Missing Profile Info";

export interface MatchResult {
  label: MatchLabel;
  reason: string;
}

// Lower number = more casual, higher number = more skilled.
const skillRank: Record<SkillLevel, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Elite: 4,
};

export function getMatch(
  player: PlayerProfile,
  game: PickupGame,
): MatchResult {
  if (!player.skillLevel) {
    return {
      label: "Missing Profile Info",
      reason:
        "Add your skill level in your profile to see how well this game fits you.",
    };
  }

  const playerRank = skillRank[player.skillLevel];
  const minRank = skillRank[game.skillRange.min];
  const maxRank = skillRank[game.skillRange.max];

  if (playerRank < minRank) {
    return {
      label: "Might Be Too Competitive",
      reason: `This game is for ${game.skillRange.min}–${game.skillRange.max} players, but your profile is ${player.skillLevel}. It may be a step up.`,
    };
  }

  if (playerRank > maxRank) {
    return {
      label: "Might Be Too Casual",
      reason: `This game is for ${game.skillRange.min}–${game.skillRange.max} players, but your profile is ${player.skillLevel}. It may be a step down.`,
    };
  }

  return {
    label: "Good Fit",
    reason: `Your ${player.skillLevel} skill level lands right in this game's ${game.skillRange.min}–${game.skillRange.max} range.`,
  };
}
