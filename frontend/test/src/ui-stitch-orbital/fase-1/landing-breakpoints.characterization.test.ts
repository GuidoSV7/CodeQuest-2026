import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("landing Stitch breakpoints", () => {
  it("ui.landing.loc_hidden and ui.landing.door_grid: mobile-first LOC + columns", () => {
    const styles = readFrontendFile("src/app/(producto)/page.module.css");
    const page = readFrontendFile("src/app/(producto)/page.tsx");

    expect(styles).not.toMatch(/\.location\s*\{/);
    expect(page).not.toContain("styles.location");
    expect(styles).toMatch(
      /\.doorGrid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
    );
    expect(styles).toMatch(
      /@media\s*\(min-width:\s*48rem\)\s*\{[\s\S]*?\.doorGrid\s*\{[^}]*repeat\(2,/s,
    );
    expect(styles).toMatch(
      /@media\s*\(min-width:\s*64rem\)\s*\{[\s\S]*?\.doorGrid\s*\{[^}]*repeat\(4,/s,
    );
    // Base rule is 1-col mobile-first (not desktop-first 4-col default)
    expect(styles).toMatch(
      /\.doorGrid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
    );
  });
});
