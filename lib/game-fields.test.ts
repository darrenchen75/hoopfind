import { describe, it, expect } from "vitest";
import { validate, fieldsToRow, emptyGame, type GameFields } from "./game-fields";

const valid: GameFields = {
  title: "Saturday Run",
  location_name: "Lincoln Park Courts",
  area: "North Side, Chicago",
  date: "2030-01-01",
  time: "09:00",
  game_type: "3v3",
  max_players: "10",
  competitiveness: "Casual",
  min_skill_level: "Beginner",
  max_skill_level: "Advanced",
  notes: "Bring a light and dark shirt.",
};

// Generate date/time fields relative to now so the tests don't rot the way a
// hard-coded "2030-01-01" eventually would. ±7 days keeps them clear of any
// same-day or DST boundary near the current moment.
function offsetDateFields(days: number): Pick<GameFields, "date" | "time"> {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

const futureDateFields = () => offsetDateFields(7);
const pastDateFields = () => offsetDateFields(-7);

describe("validate", () => {
  it("returns null for a valid game", () => {
    expect(validate(valid)).toBeNull();
  });

  it("flags a missing required field with its label", () => {
    expect(validate({ ...valid, title: "  " })).toMatch(/Game title is required/);
  });

  it("rejects non-positive max players", () => {
    expect(validate({ ...valid, max_players: "0" })).toMatch(/positive whole number/);
  });

  it("rejects non-integer max players", () => {
    expect(validate({ ...valid, max_players: "2.5" })).toMatch(/positive whole number/);
  });

  it("rejects a max skill below the min skill", () => {
    expect(
      validate({ ...valid, min_skill_level: "Advanced", max_skill_level: "Beginner" }),
    ).toMatch(/cannot be below/);
  });

  it("rejects an unparseable date/time", () => {
    expect(validate({ ...valid, date: "", time: "" })).not.toBeNull();
  });

  it("returns null for a valid future game", () => {
    expect(validate({ ...valid, ...futureDateFields() })).toBeNull();
  });

  it("rejects a start time in the past", () => {
    expect(validate({ ...valid, ...pastDateFields() })).toBe(
      "The game must start in the future.",
    );
  });
});

describe("fieldsToRow", () => {
  it("builds an ISO starts_at and trims strings", () => {
    const row = fieldsToRow(valid);
    expect(typeof row.starts_at).toBe("string");
    expect(row.title).toBe("Saturday Run");
    expect(row).not.toHaveProperty("date");
  });

  it("includes creator_id and is_public only when a creatorId is given", () => {
    expect(fieldsToRow(valid)).not.toHaveProperty("creator_id");
    const owned = fieldsToRow(valid, "user-1");
    expect(owned.creator_id).toBe("user-1");
    expect(owned.is_public).toBe(true);
  });

  it("maps empty notes to null", () => {
    expect(fieldsToRow({ ...valid, notes: "   " }).notes).toBeNull();
  });

  it("emptyGame fails validation (date/time blank)", () => {
    expect(validate(emptyGame)).not.toBeNull();
  });
});
