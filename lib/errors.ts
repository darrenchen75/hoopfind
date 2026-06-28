export const GENERIC_ERROR = "Something went wrong. Please try again.";

// Default set: curated Supabase auth strings, safe + user-actionable.
export const COMMON_SAFE_MESSAGES: ReadonlySet<string> = new Set([
  "Invalid login credentials",
  "Email not confirmed",
]);

// join_game / leave_game RPC (migrations 004, 007). Excludes access/privacy
// strings ("Game not found", "This game is not public").
export const PARTICIPATION_SAFE_MESSAGES: ReadonlySet<string> = new Set([
  "Authentication required",
  "This game has already started",
  "You have already joined this game",
  "This game is full",
  "You can no longer leave after the game has started",
  "You do not have an active joined reservation for this game",
  "This game has been canceled",
]);

// set_participant_attendance RPC (migration 006). Excludes "Only the game
// creator can update attendance" and "Participant not found for this game".
export const ATTENDANCE_SAFE_MESSAGES: ReadonlySet<string> = new Set([
  "Attendance status must be attended or missed",
  "Attendance cannot be updated before the game starts",
]);

export function toSafeMessage(
  error: { message?: string } | null | undefined,
  fallback = GENERIC_ERROR,
  safeMessages: ReadonlySet<string> = COMMON_SAFE_MESSAGES,
): string {
  return error?.message && safeMessages.has(error.message)
    ? error.message
    : fallback;
}
