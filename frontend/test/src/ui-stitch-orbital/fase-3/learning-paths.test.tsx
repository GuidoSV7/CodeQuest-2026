import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { learningPathFixtures } from "@/features/orbital/fixtures";
import { getLearningPaths } from "@/features/learning-paths/lib/learning-paths-data";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("mock learning paths surfaces", () => {
  it("derives authenticated data and empty state from one fixture source", () => {
    const dashboard = readFrontendFile(
      "src/features/learning-paths/components/LearningPathsDashboard.tsx",
    );

    expect(getLearningPaths("authenticated").status).toBe("ready");
    const collection = getLearningPaths("authenticated").data;
    expect(collection).toEqual(learningPathFixtures.authenticated);
    expect(collection?.routes).toHaveLength(2);
    expect(collection?.routes.map((route) => [route.title, route.progressPercent])).toEqual([
      ["Backend con Nest", 34],
      ["Frontend con React", 0],
    ]);
    expect(getLearningPaths("empty")).toEqual({ status: "empty", data: null });
    expect(dashboard).toContain("LearningPathsEmptyState");
    expect(dashboard).toContain("routeGrid");
  });

  it("covers loading, disabled, error and absent fixture states", () => {
    expect(getLearningPaths("loading")).toEqual({
      status: "loading",
      data: null,
    });
    expect(getLearningPaths("disabled")).toEqual({
      status: "disabled",
      data: null,
    });
    expect(getLearningPaths("error")).toEqual({
      status: "error",
      data: null,
      errorCode: "fixture_error",
    });
    expect(getLearningPaths("missing")).toEqual({
      status: "error",
      data: null,
      errorCode: "fixture_unavailable",
    });
  });

  it("keeps detail interaction local and accessible", () => {
    const detail = readFrontendFile(
      "src/features/learning-paths/components/RouteDetail.tsx",
    );

    expect(detail).toContain("aria-expanded");
    expect(detail).toContain("aria-controls");
    expect(detail).toContain("aria-pressed");
    expect(detail).toContain("useState");
    expect(detail).not.toMatch(/\b(fetch|localStorage|sessionStorage)\b/);
  });
});
