import { createClient } from "@/lib/supabase/server";
import { fetchParticipantCounts } from "@/lib/participation";
import type {
  Competitiveness,
  GameType,
  PickupGame,
  SkillLevel,
} from "@/lib/types";

const GAME_COLUMNS = "id, title, location_name, area, starts_at, game_type, max_players, competitiveness, min_skill_level, max_skill_level, notes";

type GameRow = {
  id: string;
  title: string;
  location_name: string;
  area: string;
  starts_at: string;
  game_type: string;
  max_players: number;
  competitiveness: string;
  min_skill_level: string;
  max_skill_level: string;
  notes: string | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isGameStarted(startsAt: string): boolean {
  return new Date(startsAt).getTime() <= Date.now();
}

function formatStartsAt(startsAt: string): string {
  const date = new Date(startsAt);
  const datePart = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

function mapGameRow(row: GameRow, currentPlayers = 0): PickupGame {
  return {
    id: row.id,
    title: row.title,
    locationName: row.location_name,
    area: row.area,
    startsAt: row.starts_at,
    dateTimeDisplay: formatStartsAt(row.starts_at),
    gameType: row.game_type as GameType,
    currentPlayers,
    maxPlayers: row.max_players,
    competitiveness: row.competitiveness as Competitiveness,
    skillRange: {
      min: row.min_skill_level as SkillLevel,
      max: row.max_skill_level as SkillLevel,
    },
    notes: row.notes ?? "No notes provided.",
  };
}

export async function fetchPublicGames(
  limit?: number,
): Promise<{ games: PickupGame[]; error: boolean }> {
  const supabase = await createClient();

  let query = supabase
    .from("games")
    .select(GAME_COLUMNS)
    .eq("is_public", true)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    return { games: [], error: true };
  }

  const counts = await fetchParticipantCounts();

  return {
    games: (data as GameRow[]).map((row) =>
      mapGameRow(row, counts.get(row.id) ?? 0),
    ),
    error: false,
  };
}

export async function fetchPublicGameById(
  id: string,
): Promise<PickupGame | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .eq("is_public", true)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as GameRow;
  const counts = await fetchParticipantCounts();

  return mapGameRow(row, counts.get(row.id) ?? 0);
}
