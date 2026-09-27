import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("learning paths access boundary", () => {
  it("renders authenticated fixtures without a session gate", () => {
    const dashboard = readFrontendFile(
      "src/features/learning-paths/components/LearningPathsDashboard.tsx",
    );
    const detail = readFrontendFile(
      "src/features/learning-paths/components/RouteDetail.tsx",
    );

    expect(dashboard).toContain("loadMyRoutes");
    expect(dashboard).not.toContain("if (!user)");
    expect(dashboard).not.toContain("Iniciá sesión para ver tus rutas");
    expect(dashboard).not.toContain("Cargando el estado de tu misión");
    expect(detail).toContain('getLearningPaths("authenticated")');
    expect(detail).not.toContain("if (!user)");
    expect(detail).not.toContain("Esta ruta requiere sesión");
    expect(detail).not.toContain("Cargando ruta");
  });

  it("does not call network or invent a session store write", () => {
    const dashboard = readFrontendFile(
      "src/features/learning-paths/components/LearningPathsDashboard.tsx",
    );
    const detail = readFrontendFile(
      "src/features/learning-paths/components/RouteDetail.tsx",
    );

    expect(`${dashboard}\n${detail}`).not.toContain("useAuthStore");
    expect(`${dashboard}\n${detail}`).not.toContain("setUser");
    expect(`${dashboard}\n${detail}`).not.toContain("fetch(");
  });
});
