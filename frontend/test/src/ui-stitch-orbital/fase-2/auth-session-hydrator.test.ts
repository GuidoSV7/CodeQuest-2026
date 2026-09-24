import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("auth session hydrator boundary", () => {
  it("keeps fetchMe, cancellation and explicit hydration semantics", () => {
    const hydrator = readFrontendFile(
      "src/features/auth/components/AuthSessionHydrator.tsx",
    );

    expect(hydrator).toContain("fetchMe()");
    expect(hydrator).toContain("let cancelled = false");
    expect(hydrator).toContain("if (cancelled) return");
    expect(hydrator).toContain("setUser(user)");
    expect(hydrator).toContain("setHydrated(true)");
  });
});
