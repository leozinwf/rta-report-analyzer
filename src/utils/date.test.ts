import { describe, expect, it } from "vitest";
import { getDateBounds } from "./date";

describe("getDateBounds", () => {
  it("handles report-sized date collections without spreading them as function arguments", () => {
    const dates = Array.from({ length: 160_000 }, (_, index) =>
      new Date(Date.UTC(2026, 0, 1) + index * 1_000),
    );

    const bounds = getDateBounds(dates);

    expect(bounds.min?.toISOString()).toBe(dates[0].toISOString());
    expect(bounds.max?.toISOString()).toBe(dates[dates.length - 1].toISOString());
  });

  it("ignores invalid dates", () => {
    expect(getDateBounds([new Date("invalid")])).toEqual({ min: undefined, max: undefined });
  });
});
