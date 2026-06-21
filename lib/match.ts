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

const skillRank: Record<SkillLevel, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
  Elite: 4,
};

export function getMatch(player: PlayerProfile | null, game: PickupGame): MatchResult {
  if (!player) {
    return {
      label: "Missing Profile Info",
      reason: "Log in and complete your profile to see how well this game fits you.",
    };
  }

  if (!player.skillLevel) {
    return {
      label: "Missing Profile Info",
      reason: "Add your skill level in your profile to see how well this game fits you.",
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

export type MatchTone = "success" | "warning" | "muted";

export interface MatchBadge {
  text: string;
  tone: MatchTone;
}

export function getMatchBadge(match: MatchResult): MatchBadge | null {
  switch (match.label) {
    case "Good Fit":
      return { text: "Good Fit", tone: "success" };
    case "Might Be Too Competitive":
      return { text: "Too Competitive", tone: "warning" };
    case "Might Be Too Casual":
      return { text: "Too Casual", tone: "muted" };
    case "Missing Profile Info":
      return null;
  }
}
