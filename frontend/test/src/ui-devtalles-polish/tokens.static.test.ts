import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function cssFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFilesUnder(path);
    return entry.name.endsWith(".css") ? [path] : [];
  });
}

function ruleBody(css: string, selector: string): string {
  const match = new RegExp(`(^|\\n)${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(css);
  return match?.[2] ?? "";
}

const TOKENIZED_CSS = [
  "src/features/live-path/components/LivePathScreen.module.css",
  "src/features/learning-paths/components/MyRouteStatus.module.css",
  "src/features/orbital/components/MissionShell.module.css",
  "src/app/(producto)/page.module.css",
  "src/features/auth/components/SignInLink.module.css",
  "src/features/learning-paths/components/LearningPathsEmptyState.module.css",
  "src/features/auth/components/RequireSession.module.css",
] as const;

describe("Orbital tokens instead of literals", () => {
  it.each(TOKENIZED_CSS)("%s has no hex, rgb() nor hex fallbacks", (file) => {
    const css = readFrontendFile(file);

    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\brgba?\(/);
    expect(css).not.toMatch(/var\(--[\w-]+,\s*#/);
  });

  it("no stylesheet uses the undefined --live-display font", () => {
    for (const file of cssFilesUnder(resolve(frontendRoot, "src"))) {
      expect(readFileSync(file, "utf8"), file).not.toContain("var(--live-display)");
    }
  });
});

describe("LivePath motion and title", () => {
  it("animates with the standard Orbital motion and keeps EXIT_MS in sync", () => {
    const css = readFrontendFile("src/features/live-path/components/LivePathScreen.module.css");
    const modal = readFrontendFile("src/features/live-path/components/LivePathModal.tsx");

    expect(css).toContain("var(--orbital-motion-standard)");
    expect(css).not.toContain("ease;");
    expect(modal).toContain("const EXIT_MS = 240;");
  });

  it("writes the route title in sentence case", () => {
    const css = readFrontendFile("src/features/live-path/components/LivePathScreen.module.css");
    const title = ruleBody(css, ".title");

    expect(title).not.toBe("");
    expect(title).not.toContain("text-transform");
  });
});

describe("headings without forced case", () => {
  it("keeps the /mis-rutas and assessment titles in sentence case", () => {
    expect(readFrontendFile("src/app/(producto)/mis-rutas/page.module.css")).not.toContain("lowercase");
    expect(readFrontendFile("src/features/assessment/components/AssessmentResults.module.css")).not.toContain(
      "text-transform: lowercase",
    );
  });
});
