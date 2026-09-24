import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("header responsive after mobile nav", () => {
  it("keeps 4rem / 48rem / nowrap product chrome without 42rem avatar hide", () => {
    const css = readFrontendFile(
      "src/features/orbital/components/MissionShell.module.css",
    );
    const shell = readFrontendFile(
      "src/features/orbital/components/MissionShell.tsx",
    );

    expect(css).toContain("flex-wrap: nowrap");
    expect(css).toContain("@media (min-width: 48rem)");
    expect(css).not.toContain("@media (max-width: 42rem)");
    expect(css).not.toMatch(/\.avatar\s*\{[^}]*display:\s*none/s);
    expect(shell).toContain("MissionShellMobileNav");
    expect(shell).toContain("PRODUCT_LINKS");
  });
});
