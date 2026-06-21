import { describe, it, expect } from "vitest";
import { getMatchBadge } from "./match";

describe("getMatchBadge", () => {
  it("maps Good Fit to a success badge", () => {
    expect(getMatchBadge({ label: "Good Fit", reason: "" })).toEqual({
      text: "Good Fit",
      tone: "success",
    });
  });

  it("maps Might Be Too Competitive to a warning badge", () => {
    expect(
      getMatchBadge({ label: "Might Be Too Competitive", reason: "" }),
    ).toEqual({ text: "Too Competitive", tone: "warning" });
  });

  it("maps Might Be Too Casual to a muted badge", () => {
    expect(
      getMatchBadge({ label: "Might Be Too Casual", reason: "" }),
    ).toEqual({ text: "Too Casual", tone: "muted" });
  });

  it("returns null for Missing Profile Info", () => {
    expect(
      getMatchBadge({ label: "Missing Profile Info", reason: "" }),
    ).toBeNull();
  });
});
