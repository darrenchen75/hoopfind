import { createClient } from "@/lib/supabase/server";
import type { PlayerProfile, SkillLevel } from "@/lib/types";

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
};

export async function getCurrentProfile(): Promise<PlayerProfile | null> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, area, skill_level")
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
  };
}
