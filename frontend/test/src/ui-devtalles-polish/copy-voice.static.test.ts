import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

const LIVE_COPY_FILES = [
  "src/app/(producto)/page.tsx",
  "src/features/orbital/fixtures/landing.fixture.ts",
  "src/features/orbital/components/MissionRadar.tsx",
  "src/features/auth/components/LoginPanel.tsx",
  "src/features/integrations/components/GithubPreview.tsx",
  "src/features/learning-paths/components/ReplanningProposal.tsx",
  "src/features/assessment/components/AssessmentResults.tsx",
  "src/features/assessment/components/TypescriptCheckpoint.tsx",
  "src/features/live-path/components/LivePathScreen.tsx",
  "src/features/learning-paths/components/MyRouteStatus.tsx",
  "src/features/learning-paths/components/LearningPathsEmptyState.tsx",
  "src/features/learning-paths/components/LearningPathsDashboard.tsx",
  "src/features/auth/components/SignInLink.tsx",
  "src/features/auth/components/RequireSession.tsx",
  "src/app/(producto)/mis-rutas/page.tsx",
  "src/app/(producto)/mis-rutas/[routeId]/page.tsx",
] as const;

// `\b` treats accented letters as boundaries (would flag "Llevá"), so letters are checked with \p{L}.
const TUTEO = /(?<!\p{L})(Inicia|Descubre|Selecciona|Copia y pega|Elige|Vienes|necesitas|Lleva|Deja|tienes)(?!\p{L})/u;

function renderedCopy(source: string): string {
  return source
    .split(/\r?\n/)
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join("\n")
    .replace(/https?:\/\/\S+/g, "");
}

describe("live copy speaks in voseo without terminal separators", () => {
  it.each(LIVE_COPY_FILES)("%s has no `//` separator nor tuteo", (file) => {
    const copy = renderedCopy(readFrontendFile(file));

    expect(copy).not.toMatch(/\S\s\/\/\s\S/);
    expect(copy).not.toMatch(TUTEO);
  });

  it("keeps the LivePath waiting copy neutral about the AI client", () => {
    expect(readFrontendFile("src/features/live-path/components/LivePathScreen.tsx")).not.toContain("Claude");
  });
});
