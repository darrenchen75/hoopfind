import { getCurrentUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SkillLevel, UserProfile } from "@/lib/types";

const SKILL_LEVELS: SkillLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Elite",
];

function toSkillLevel(value: string | null): SkillLevel | undefined {
  return value && (SKILL_LEVELS as string[]).includes(value)
    ? (value as SkillLevel)
    : undefined;
}

type ProfileRow = {
  display_name: string | null;
  area: string | null;
  skill_level: string | null;
  primary_position: string | null;
  play_style: string | null;
  competitiveness: string | null;
  availability: string | null;
  max_travel_distance: number | null;
};

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name, area, skill_level, primary_position, play_style, competitiveness, availability, max_travel_distance",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as ProfileRow;

  return {
    displayName: row.display_name ?? "",
    area: row.area ?? "",
    skillLevel: toSkillLevel(row.skill_level),
    primaryPosition: row.primary_position ?? "",
    playStyle: row.play_style ?? "",
    competitiveness: row.competitiveness ?? "",
    availability: row.availability ?? "",
    maxTravelDistance: row.max_travel_distance,
  };
}

export function isProfileComplete(profile: UserProfile | null): boolean {
  if (!profile) {
    return false;
  }

  return (
    profile.displayName.trim() !== "" &&
    profile.area.trim() !== "" &&
    !!profile.skillLevel &&
    profile.primaryPosition.trim() !== "" &&
    profile.playStyle.trim() !== "" &&
    profile.competitiveness.trim() !== "" &&
    profile.availability.trim() !== "" &&
    profile.maxTravelDistance !== null &&
    profile.maxTravelDistance !== undefined
  );
}
