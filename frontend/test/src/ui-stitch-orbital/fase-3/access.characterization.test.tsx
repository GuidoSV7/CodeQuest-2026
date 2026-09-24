import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("learning paths access boundary", () => {
  it("does not reveal route data before authentication", () => {
    const dashboard = readFrontendFile(
      "src/features/learning-paths/components/LearningPathsDashboard.tsx",
    );
    const detail = readFrontendFile(
      "src/features/learning-paths/components/RouteDetail.tsx",
    );

    expect(dashboard).toContain("if (!user)");
    expect(dashboard).toContain("Iniciá sesión para ver tus rutas");
    expect(detail).toContain("if (!user)");
    expect(detail).toContain("Esta ruta requiere sesión");
  });

  it("uses hydrated real session state and does not create a fake session", () => {
    const dashboard = readFrontendFile(
      "src/features/learning-paths/components/LearningPathsDashboard.tsx",
    );
    const detail = readFrontendFile(
      "src/features/learning-paths/components/RouteDetail.tsx",
    );

    expect(`${dashboard}\n${detail}`).toContain("useAuthStore");
    expect(`${dashboard}\n${detail}`).not.toContain("setUser");
    expect(`${dashboard}\n${detail}`).not.toContain("fetch(");
  });
});
