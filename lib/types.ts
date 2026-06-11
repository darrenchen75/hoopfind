export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Elite";
export type Competitiveness = "Casual" | "Competitive" | "Highly Competitive";
export type GameType = "3v3" | "4v4" | "5v5" | "Open Run";

export interface SkillRange {
  min: SkillLevel;
  max: SkillLevel;
}

export interface PlayerProfile {
  displayName: string;
  area: string;
  skillLevel?: SkillLevel;
}

export type AttendanceStatus = "Joined" | "Attended" | "Missed";

export interface JoinedPlayer {
  name: string;
  status: AttendanceStatus;
}

export interface PickupGame {
  id: string;
  title: string;
  locationName: string;
  area: string;
  dateTimeDisplay: string;
  gameType: GameType;
  currentPlayers: number;
  maxPlayers: number;
  competitiveness: Competitiveness;
  skillRange: SkillRange;
  notes: string;
}
