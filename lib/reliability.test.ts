import { describe, it, expect } from "vitest";
import { reliability } from "./reliability";

describe("reliability", () => {
  it("returns null pct and zero decided when no decided games", () => {
    expect(reliability(0, 0)).toEqual({ pct: null, decided: 0 });
  });

  it("rounds the percentage to the nearest whole number", () => {
    expect(reliability(9, 2)).toEqual({ pct: 82, decided: 11 }); // 81.8 -> 82
  });

  it("returns 100 for a perfect record", () => {
    expect(reliability(1, 0)).toEqual({ pct: 100, decided: 1 });
  });

  it("returns 0 when every decided game was missed", () => {
    expect(reliability(0, 3)).toEqual({ pct: 0, decided: 3 });
  });

  it("rounds a one-third record down", () => {
    expect(reliability(1, 2)).toEqual({ pct: 33, decided: 3 }); // 33.3 -> 33
  });
});
