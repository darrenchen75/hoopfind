import { createClient } from "@/lib/supabase/server";

export type ParticipationStatus = "joined" | "attended" | "missed";
export interface GameParticipation {
  isAuthenticated: boolean;
  status: ParticipationStatus | null;
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

export async function getGameParticipation(
  gameId: string,
): Promise<GameParticipation> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return { isAuthenticated: false, status: null };
  }

  const { data } = await supabase
    .from("game_participants")
    .select("status")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    isAuthenticated: true,
    status: (data?.status as ParticipationStatus | undefined) ?? null,
  };
}
