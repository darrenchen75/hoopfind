import { createClient } from "@/lib/supabase/server";
import {
  toParticipationStatus,
  type ParticipationStatus,
} from "@/lib/participation";

export interface RosterEntry {
  displayName: string;
  skillLevel: string | null;
  primaryPosition: string | null;
  playStyle: string | null;
}

export interface HostParticipant {
  userId: string;
  displayName: string;
  status: ParticipationStatus;
}

type RosterRow = {
  display_name: string | null;
  skill_level: string | null;
  primary_position: string | null;
  play_style: string | null;
};

type HostRow = {
  user_id: string;
  display_name: string | null;
  status: string;
};

export async function fetchGameRoster(
  gameId: string,
): Promise<{ roster: RosterEntry[]; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_game_roster", {
    target_game_id: gameId,
  });

  if (error) {
    return { roster: [], error: true };
  }

  const roster = ((data as RosterRow[] | null) ?? []).map((r) => ({
    displayName: r.display_name ?? "Player",
    skillLevel: r.skill_level,
    primaryPosition: r.primary_position,
    playStyle: r.play_style,
  }));
  return { roster, error: false };
}

export async function fetchHostGameParticipants(
  gameId: string,
): Promise<{ participants: HostParticipant[]; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_host_game_participants", {
    target_game_id: gameId,
  });

  if (error) {
    return { participants: [], error: true };
  }

  const participants = ((data as HostRow[] | null) ?? []).flatMap((r) => {
    const status = toParticipationStatus(r.status);
    return status
      ? [{ userId: r.user_id, displayName: r.display_name ?? "Player", status }]
      : [];
  });
  return { participants, error: false };
}
