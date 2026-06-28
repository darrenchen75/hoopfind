import { describe, it, expect } from "vitest";
import {
  toSafeMessage,
  GENERIC_ERROR,
  COMMON_SAFE_MESSAGES,
  PARTICIPATION_SAFE_MESSAGES,
  ATTENDANCE_SAFE_MESSAGES,
} from "./errors";

describe("toSafeMessage", () => {
  it("returns an allowlisted message as-is", () => {
    expect(
      toSafeMessage({ message: "This game is full" }, GENERIC_ERROR, PARTICIPATION_SAFE_MESSAGES),
    ).toBe("This game is full");
  });

  it("matches against the default COMMON set", () => {
    expect(toSafeMessage({ message: "Invalid login credentials" })).toBe(
      "Invalid login credentials",
    );
  });

  it("returns the fallback for an unknown raw error", () => {
    expect(
      toSafeMessage(
        { message: 'duplicate key value violates unique constraint "games_pkey"' },
        GENERIC_ERROR,
        PARTICIPATION_SAFE_MESSAGES,
      ),
    ).toBe(GENERIC_ERROR);
  });

  it("returns the fallback for null, undefined, or message-less error", () => {
    expect(toSafeMessage(null)).toBe(GENERIC_ERROR);
    expect(toSafeMessage(undefined)).toBe(GENERIC_ERROR);
    expect(toSafeMessage({ message: undefined })).toBe(GENERIC_ERROR);
  });

  it("uses a custom fallback", () => {
    expect(toSafeMessage(null, "Custom fallback")).toBe("Custom fallback");
  });

  it("genericizes a message that belongs to a different set", () => {
    expect(
      toSafeMessage({ message: "This game is full" }, GENERIC_ERROR, ATTENDANCE_SAFE_MESSAGES),
    ).toBe(GENERIC_ERROR);
  });

  it("excludes privacy/access strings from the sets", () => {
    expect(COMMON_SAFE_MESSAGES.has("Email not confirmed")).toBe(true);
    expect(PARTICIPATION_SAFE_MESSAGES.has("Game not found")).toBe(false);
    expect(ATTENDANCE_SAFE_MESSAGES.has("Only the game creator can update attendance")).toBe(false);
  });
});
