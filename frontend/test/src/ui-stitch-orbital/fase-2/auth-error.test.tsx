import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("Orbital auth error surface", () => {
  it("keeps known reasons and a safe fallback catalog", () => {
    const page = readFrontendFile("src/app/(acceso)/auth/error/page.tsx");

    expect(page).toContain("REASONS");
    expect(page).toContain("access_denied");
    expect(page).toContain("invalid_state");
    expect(page).toContain("No se pudo completar");
    expect(page).toContain('href="/login"');
    expect(page).not.toContain("error.stack");
  });

  it("does not expose secrets or internal error details", () => {
    const page = readFrontendFile("src/app/(acceso)/auth/error/page.tsx");

    expect(page).not.toMatch(/secret|password|authorization/i);
    expect(page).not.toContain("String(error)");
  });

  it("provides a focusable navigation landmark", () => {
    const page = readFrontendFile("src/app/(acceso)/auth/error/page.tsx");
    const styles = readFrontendFile("src/app/(acceso)/auth/error/page.module.css");

    expect(page).toContain("<main");
    expect(page).toContain("Saltar al contenido");
    expect(page).toContain("role=\"alert\"");
    expect(styles).toContain(".skipLink");
    expect(styles).toContain("var(--orbital-error)");
  });
});
