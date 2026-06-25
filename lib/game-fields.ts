import { getBrowserTimeZone, normalizeTimeZone, wallClockToUtcIso } from "./datetime";

export const gameTypes = ["3v3", "4v4", "5v5", "Open Run"];
export const competitivenessLevels = ["Casual", "Competitive", "Highly Competitive"];
export const skillLevels = ["Beginner", "Intermediate", "Advanced", "Elite"];

export type GameFields = {
  title: string;
  location_name: string;
  area: string;
  date: string;
  time: string;
  game_type: string;
  max_players: string;
  competitiveness: string;
  min_skill_level: string;
  max_skill_level: string;
  notes: string;
  timezone?: string;
};

export const emptyGame: GameFields = {
  title: "",
  location_name: "",
  area: "",
  date: "",
  time: "",
  game_type: gameTypes[0],
  max_players: "",
  competitiveness: competitivenessLevels[0],
  min_skill_level: skillLevels[0],
  max_skill_level: skillLevels[0],
  notes: "",
  timezone: "",
};

// A stored zone (edit) is normalized; an empty zone (create) falls back to the
// browser's zone. The resolved value is what gets stored.
function resolveTimeZone(timezone: string | undefined): string {
  const provided = (timezone ?? "").trim();
  return provided ? normalizeTimeZone(provided) : getBrowserTimeZone();
}

export function validate(fields: GameFields): string | null {
  const required: [keyof GameFields, string][] = [
    ["title", "Game title"],
    ["location_name", "Location name"],
    ["area", "City / area"],
    ["date", "Date"],
    ["time", "Time"],
    ["max_players", "Max players"],
  ];
  for (const [key, fieldLabel] of required) {
    if (!(fields[key] ?? "").trim()) {
      return `${fieldLabel} is required.`;
    }
  }

  const maxPlayers = Number(fields.max_players);
  if (!Number.isInteger(maxPlayers) || maxPlayers <= 0) {
    return "Max players must be a positive whole number.";
  }

  if (skillLevels.indexOf(fields.max_skill_level) < skillLevels.indexOf(fields.min_skill_level)) {
    return "Maximum skill level cannot be below the minimum skill level.";
  }

  const timeZone = resolveTimeZone(fields.timezone);
  const startsAt = new Date(wallClockToUtcIso(fields.date, fields.time, timeZone));
  if (Number.isNaN(startsAt.getTime())) {
    return "The date and time combination is not valid.";
  }

  if (startsAt.getTime() <= Date.now()) {
    return "The game must start in the future.";
  }

  return null;
}

export function fieldsToRow(
  fields: GameFields,
  creatorId?: string,
): Record<string, unknown> {
  const timeZone = resolveTimeZone(fields.timezone);
  const row: Record<string, unknown> = {
    title: fields.title.trim(),
    location_name: fields.location_name.trim(),
    area: fields.area.trim(),
    starts_at: wallClockToUtcIso(fields.date, fields.time, timeZone),
    timezone: timeZone,
    game_type: fields.game_type,
    max_players: Number(fields.max_players),
    competitiveness: fields.competitiveness,
    min_skill_level: fields.min_skill_level,
    max_skill_level: fields.max_skill_level,
    notes: fields.notes.trim() || null,
  };
  if (creatorId) {
    row.creator_id = creatorId;
    row.is_public = true;
  }
  return row;
}
