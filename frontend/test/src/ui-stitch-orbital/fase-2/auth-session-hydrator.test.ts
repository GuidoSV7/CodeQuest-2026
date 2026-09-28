import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("auth session hydrator boundary", () => {
  it("hydrates the demo fixture without fetchMe or cancellation branches", () => {
    const hydrator = readFrontendFile(
      "src/features/auth/components/AuthSessionHydrator.tsx",
    );

    expect(hydrator).toMatch(/\bresolveOrbitalSessionRead\b/);
    expect(hydrator).toMatch(/\bfetchMeStatus\b/);
    expect(hydrator).toMatch(/\bapplySessionRead\b/);
  });
});
