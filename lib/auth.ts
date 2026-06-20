import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Several data helpers read the auth claims within a single request (the game
// detail page alone hits profile + participation, the dashboard hits four
// helpers). React's cache() collapses those into one getClaims() per render
// instead of three or four. Returns the user id, or null when signed out.
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});
