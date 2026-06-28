import { getCurrentUserId } from "@/lib/auth";
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

export function toParticipationStatus(
  value: unknown,
): ParticipationStatus | null {
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
  const userId = await getCurrentUserId();

  if (!userId) {
    return { isAuthenticated: false, gameIds: [], error: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_participants")
    .select("game_id")
    .eq("user_id", userId)
    .eq("status", "joined");

  if (error) {
    console.error("getJoinedGameIds", error);
    return { isAuthenticated: true, gameIds: [], error: true };
  }

  const gameIds = (data as { game_id: string }[]).map((row) => row.game_id);
  return { isAuthenticated: true, gameIds, error: false };
}

export async function getGameParticipation(
  gameId: string,
): Promise<GameParticipation> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return { isAuthenticated: false, userId: null, status: null, error: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_participants")
    .select("status")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getGameParticipation", error);
    return { isAuthenticated: true, userId, status: null, error: true };
  }

  return {
    isAuthenticated: true,
    userId,
    status: toParticipationStatus(data?.status),
    error: false,
  };
}

export interface AttendanceCounts {
  attended: number;
  missed: number;
  error: boolean;
}

// All-time decided attendance for the current user, counted from their own
// game_participants rows — not from any 6-item display list.
export async function getCurrentUserAttendanceCounts(): Promise<AttendanceCounts> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { attended: 0, missed: 0, error: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_participants")
    .select("status")
    .eq("user_id", userId)
    .in("status", ["attended", "missed"]);

  if (error) {
    console.error("getCurrentUserAttendanceCounts", error);
    return { attended: 0, missed: 0, error: true };
  }

  let attended = 0;
  let missed = 0;
  for (const row of data as { status: string }[]) {
    if (row.status === "attended") {
      attended += 1;
    } else if (row.status === "missed") {
      missed += 1;
    }
  }
  return { attended, missed, error: false };
}
