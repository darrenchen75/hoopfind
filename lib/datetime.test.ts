import { describe, it, expect } from "vitest";
import {
  DEFAULT_TIME_ZONE,
  normalizeTimeZone,
  getBrowserTimeZone,
  wallClockToUtcIso,
  utcIsoToWallClockParts,
  formatGameDateTime,
} from "./datetime";

describe("normalizeTimeZone", () => {
  it("returns a valid zone unchanged", () => {
    expect(normalizeTimeZone("America/Chicago")).toBe("America/Chicago");
  });
  it("falls back to default for an invalid zone", () => {
    expect(normalizeTimeZone("Not/AZone")).toBe(DEFAULT_TIME_ZONE);
  });
  it("falls back to default for empty/null/undefined", () => {
    expect(normalizeTimeZone("")).toBe(DEFAULT_TIME_ZONE);
    expect(normalizeTimeZone("   ")).toBe(DEFAULT_TIME_ZONE);
    expect(normalizeTimeZone(null)).toBe(DEFAULT_TIME_ZONE);
    expect(normalizeTimeZone(undefined)).toBe(DEFAULT_TIME_ZONE);
  });
});

describe("getBrowserTimeZone", () => {
  it("returns a non-empty zone that normalizes to itself", () => {
    const tz = getBrowserTimeZone();
    expect(tz.length).toBeGreaterThan(0);
    expect(normalizeTimeZone(tz)).toBe(tz);
  });
});

describe("wallClockToUtcIso", () => {
  // 2026-07-01 is summer: EDT = UTC-4, PDT = UTC-7.
  it("converts an Eastern wall-clock to the correct UTC instant", () => {
    expect(wallClockToUtcIso("2026-07-01", "09:00", "America/New_York")).toBe(
      "2026-07-01T13:00:00.000Z",
    );
  });
  it("yields a different instant for a different zone", () => {
    const east = wallClockToUtcIso("2026-07-01", "09:00", "America/New_York");
    const west = wallClockToUtcIso("2026-07-01", "09:00", "America/Los_Angeles");
    expect(west).toBe("2026-07-01T16:00:00.000Z");
    expect(west).not.toBe(east);
  });
  it("falls back to the default zone for an invalid zone", () => {
    expect(wallClockToUtcIso("2026-07-01", "09:00", "Not/AZone")).toBe(
      wallClockToUtcIso("2026-07-01", "09:00", DEFAULT_TIME_ZONE),
    );
  });
});

describe("utcIsoToWallClockParts", () => {
  it("renders an instant as date/time in the given zone", () => {
    expect(
      utcIsoToWallClockParts("2026-07-01T13:00:00.000Z", "America/New_York"),
    ).toEqual({ date: "2026-07-01", time: "09:00" });
  });
  it("returns 00:00 for local midnight, never 24:00", () => {
    // 04:00Z on 2026-07-01 is 00:00 EDT.
    expect(
      utcIsoToWallClockParts("2026-07-01T04:00:00.000Z", "America/New_York").time,
    ).toBe("00:00");
  });
});

describe("round-trip", () => {
  it("parts then back yields the original instant", () => {
    const iso = "2026-07-01T13:00:00.000Z";
    const zone = "America/New_York";
    const { date, time } = utcIsoToWallClockParts(iso, zone);
    expect(wallClockToUtcIso(date, time, zone)).toBe(iso);
  });
});

describe("formatGameDateTime", () => {
  it("formats in the given zone", () => {
    expect(formatGameDateTime("2026-07-01T13:00:00.000Z", "America/New_York")).toContain("9:00");
  });
  it("does not throw on an invalid zone", () => {
    expect(() => formatGameDateTime("2026-07-01T13:00:00.000Z", "Not/AZone")).not.toThrow();
  });
});
