import { describe, expect, it } from "vitest";
import {
  activeNodeIndex,
  radarBearingDegrees,
  selectActivePathProgress,
} from "@/features/orbital/lib/radar-progress";

describe("radarBearingDegrees", () => {
  it("points up when there is no progress", () => {
    expect(radarBearingDegrees(0)).toBe(0);
  });

  it("maps a full path to a full turn", () => {
    expect(radarBearingDegrees(1)).toBe(360);
  });

  it("turns halfway at 50 percent", () => {
    expect(radarBearingDegrees(0.5)).toBe(180);
  });

  it("clamps values outside 0..1", () => {
    expect(radarBearingDegrees(-0.2)).toBe(0);
    expect(radarBearingDegrees(1.4)).toBe(360);
  });
});

describe("activeNodeIndex", () => {
  it("does not mark a node when there is no progress", () => {
    expect(activeNodeIndex(0, 6)).toBe(-1);
  });

  it("stays on the last node when the path is complete", () => {
    expect(activeNodeIndex(1, 6)).toBe(5);
  });

  it("returns -1 when there are no nodes", () => {
    expect(activeNodeIndex(0.4, 0)).toBe(-1);
  });
});

describe("selectActivePathProgress", () => {
  it("is idle without paths", () => {
    expect(selectActivePathProgress([])).toEqual({
      progressRatio: 0,
      completedCount: 0,
      itemCount: 0,
    });
  });

  it("uses the latest active path and ignores archived ones", () => {
    expect(
      selectActivePathProgress([
        {
          status: "archived",
          updatedAt: "2026-09-24T00:00:00.000Z",
          progressRatio: 1,
          completedCount: 8,
          itemCount: 8,
        },
        {
          status: "active",
          updatedAt: "2026-09-20T00:00:00.000Z",
          progressRatio: 0.25,
          completedCount: 1,
          itemCount: 4,
        },
        {
          status: "active",
          updatedAt: "2026-09-23T00:00:00.000Z",
          progressRatio: 0.5,
          completedCount: 2,
          itemCount: 4,
        },
      ]),
    ).toEqual({
      progressRatio: 0.5,
      completedCount: 2,
      itemCount: 4,
    });
  });
});
