import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

const LUCIDE_FILES = {
  "src/features/orbital/components/MissionShellMobileNav.tsx": ["Menu", "X"],
  "src/features/learning-paths/components/MyRouteStatus.tsx": ["Copy", "Check", "ChevronDown"],
  "src/features/live-path/components/LivePathScreen.tsx": ["X"],
  "src/app/(producto)/page.tsx": ["ArrowRight", "ArrowUpRight", "ExternalLink"],
  "src/features/integrations/components/GithubPreview.tsx": ["Check", "Copy"],
  "src/features/assessment/components/AssessmentResults.tsx": ["ArrowRight"],
  "src/features/assessment/components/TypescriptCheckpoint.tsx": ["ArrowRight"],
} as const;

const ICON_USAGE = /<(Menu|X|Copy|Check|ChevronDown|ArrowRight|ArrowUpRight|ExternalLink)\b[^>]*>/g;

describe("chrome icons come from lucide-react", () => {
  it("pins lucide-react to an exact version", () => {
    const pkg: { dependencies: Record<string, string> } = JSON.parse(readFrontendFile("package.json"));

    expect(pkg.dependencies["lucide-react"]).toBe("1.48.0");
  });

  it.each(Object.entries(LUCIDE_FILES))("%s uses named imports with the shared stroke", (file, icons) => {
    const source = readFrontendFile(file);

    expect(source).toMatch(/import \{[^}]+\} from "lucide-react"/);
    expect(source).not.toMatch(/import \* as \w+ from "lucide-react"|import \w+ from "lucide-react"/);
    for (const icon of icons) {
      expect(source).toMatch(new RegExp(`<${icon}\\b`));
    }
    for (const usage of source.match(ICON_USAGE) ?? []) {
      expect(usage).toContain("strokeWidth={CHROME_ICON_STROKE_WIDTH}");
      expect(usage).toContain('aria-hidden="true"');
    }
  });

  it("drops ad hoc chrome glyphs", () => {
    expect(readFrontendFile("src/features/orbital/components/MissionShellMobileNav.tsx")).not.toContain("<svg");
    expect(readFrontendFile("src/features/learning-paths/components/MyRouteStatus.tsx")).not.toContain("<svg");
    expect(readFrontendFile("src/features/live-path/components/LivePathScreen.tsx")).not.toContain("×");
  });
});

describe("shell copy", () => {
  it.each([
    "src/features/auth/components/ShellAccount.tsx",
    "src/features/orbital/components/MissionShell.tsx",
    "src/features/orbital/components/MissionShellMobileNav.tsx",
  ])("%s has no Login/Register nor the old nav label", (file) => {
    const source = readFrontendFile(file);

    expect(source).not.toMatch(/>\s*(Login|Register)\s*</);
    expect(source).not.toContain("Descubre tu ruta");
  });
});
