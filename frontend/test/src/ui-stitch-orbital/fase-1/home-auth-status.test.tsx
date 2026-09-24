import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("HomeAuthStatus", () => {
  it("preserves anonymous and hydrating as non-disclosing states", () => {
    const component = readFrontendFile(
      "src/features/auth/components/HomeAuthStatus.tsx",
    );

    expect(component).toContain("!hydrated || !user");
    expect(component).not.toContain("avatarUrl");
    expect(component).not.toContain("email");
  });

  it("preserves the authenticated display name and keyboard-safe semantics", () => {
    const component = readFrontendFile(
      "src/features/auth/components/HomeAuthStatus.tsx",
    );
    const styles = readFrontendFile(
      "src/features/auth/components/HomeAuthStatus.module.css",
    );

    expect(component).toContain("user.displayName");
    expect(component).toContain("<p");
    expect(styles).toContain("var(--orbital-ink)");
  });
});
