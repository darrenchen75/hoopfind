import { getCurrentUserId } from "@/lib/auth";
import { formatGameDateTime } from "@/lib/datetime";
import { createClient } from "@/lib/supabase/server";
import {
  fetchParticipantCounts,
  getJoinedGameIds,
  toParticipationStatus,
  type ParticipationStatus,
} from "@/lib/participation";
import type {
  Competitiveness,
  GameType,
  PickupGame,
  SkillLevel,
} from "@/lib/types";

const GAME_COLUMNS = "id, creator_id, title, location_name, area, starts_at, game_type, max_players, competitiveness, min_skill_level, max_skill_level, notes, canceled_at, timezone";

export type GameRow = {
  id: string;
  creator_id: string;
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
  canceled_at: string | null;
  timezone: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isGameStarted(startsAt: string): boolean {
  return new Date(startsAt).getTime() <= Date.now();
}

function mapGameRow(row: GameRow, currentPlayers = 0): PickupGame {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    locationName: row.location_name,
    area: row.area,
    startsAt: row.starts_at,
    dateTimeDisplay: formatGameDateTime(row.starts_at, row.timezone),
    gameType: row.game_type as GameType,
    currentPlayers,
    maxPlayers: row.max_players,
    competitiveness: row.competitiveness as Competitiveness,
    skillRange: {
      min: row.min_skill_level as SkillLevel,
      max: row.max_skill_level as SkillLevel,
    },
    notes: row.notes ?? "No notes provided.",
    isCanceled: row.canceled_at !== null,
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
    .is("canceled_at", null)
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

export async function fetchCurrentUserJoinedGames(): Promise<{
  games: PickupGame[];
  error: boolean;
}> {
  const { gameIds, error: participationError } = await getJoinedGameIds();

  if (participationError) {
    return { games: [], error: true };
  }

  if (gameIds.length === 0) {
    return { games: [], error: false };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .in("id", gameIds)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

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

export async function fetchCurrentUserHostedGames(): Promise<{
  games: PickupGame[];
  error: boolean;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { games: [], error: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .eq("creator_id", userId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

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

// The user's 6 most recent past games they created, for attendance review.
export async function fetchCurrentUserPastHostedGames(): Promise<{
  games: PickupGame[];
  error: boolean;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { games: [], error: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .eq("creator_id", userId)
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(6);

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

// The user's 6 most recent past games they participated in, with their own
// status. Reads the user's own game_participants rows (all statuses), so it
// must NOT reuse getJoinedGameIds() — that helper returns only currently
// joined rows and would drop past attended/missed games.
export async function fetchCurrentUserPastJoinedGames(): Promise<{
  games: { game: PickupGame; status: ParticipationStatus }[];
  error: boolean;
}> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { games: [], error: false };
  }

  const supabase = await createClient();

  const { data: partData, error: partError } = await supabase
    .from("game_participants")
    .select("game_id, status")
    .eq("user_id", userId);

  if (partError) {
    return { games: [], error: true };
  }

  const statusByGame = new Map<string, ParticipationStatus>();
  for (const row of partData as { game_id: string; status: string }[]) {
    const status = toParticipationStatus(row.status);
    if (status) {
      statusByGame.set(row.game_id, status);
    }
  }

  if (statusByGame.size === 0) {
    return { games: [], error: false };
  }

  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .in("id", [...statusByGame.keys()])
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(6);

  if (error) {
    return { games: [], error: true };
  }

  const counts = await fetchParticipantCounts();

  return {
    games: (data as GameRow[]).map((row) => ({
      game: mapGameRow(row, counts.get(row.id) ?? 0),
      // Non-null: every returned game id came from statusByGame.
      status: statusByGame.get(row.id)!,
    })),
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

export async function fetchGameForEdit(id: string): Promise<GameRow | null> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select(GAME_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as GameRow;
  return row.creator_id === userId ? row : null;
}
