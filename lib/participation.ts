import { createClient } from "@/lib/supabase/server";

export type ParticipationStatus = "joined" | "attended" | "missed";
export interface GameParticipation {
  isAuthenticated: boolean;
  userId: string | null;
  status: ParticipationStatus | null;
  error: boolean;
}

const PARTICIPATION_STATUSES: ParticipationStatus[] = [
  "joined",
  "attended",
  "missed",
];

function toParticipationStatus(value: unknown): ParticipationStatus | null {
  return PARTICIPATION_STATUSES.includes(value as ParticipationStatus)
    ? (value as ParticipationStatus)
    : null;
}

type ParticipantCountRow = {
  game_id: string;
  participant_count: number;
};

export async function fetchParticipantCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_public_game_participant_counts",
  );

  const counts = new Map<string, number>();
  if (error || !data) {
    return counts;
  }

  for (const row of data as ParticipantCountRow[]) {
    counts.set(row.game_id, Number(row.participant_count));
  }
  return counts;
}

export interface JoinedGameIds {
  isAuthenticated: boolean;
  gameIds: string[];
  error: boolean;
}

export async function getJoinedGameIds(): Promise<JoinedGameIds> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return { isAuthenticated: false, gameIds: [], error: false };
  }

  const { data, error } = await supabase
    .from("game_participants")
    .select("game_id")
    .eq("user_id", userId)
    .eq("status", "joined");

  if (error) {
    return { isAuthenticated: true, gameIds: [], error: true };
  }

  const gameIds = (data as { game_id: string }[]).map((row) => row.game_id);
  return { isAuthenticated: true, gameIds, error: false };
}

export async function getGameParticipation(
  gameId: string,
): Promise<GameParticipation> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return { isAuthenticated: false, userId: null, status: null, error: false };
  }

  const { data, error } = await supabase
    .from("game_participants")
    .select("status")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { isAuthenticated: true, userId, status: null, error: true };
  }

  return {
    isAuthenticated: true,
    userId,
    status: toParticipationStatus(data?.status),
    error: false,
  };
}
