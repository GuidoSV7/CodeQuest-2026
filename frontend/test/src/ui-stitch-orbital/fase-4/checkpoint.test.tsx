import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("TypeScript checkpoint mock", () => {
  it("covers selection, disabled confirmation, loading and feedback", () => {
    const checkpoint = readFrontendFile(
      "src/features/assessment/components/TypescriptCheckpoint.tsx",
    );

    expect(checkpoint).toContain('disabled={selected === null}');
    expect(checkpoint).toContain('setStatus("loading")');
    expect(checkpoint).toContain("aria-live");
    expect(checkpoint).toContain("Reintentar");
    expect(checkpoint).toContain("Confirmar respuesta");
    expect(checkpoint).toContain("aria-live");
  });

  it("does not request or persist checkpoint progress", () => {
    const checkpoint = readFrontendFile(
      "src/features/assessment/components/TypescriptCheckpoint.tsx",
    );

    expect(checkpoint).not.toMatch(
      /\b(fetch|axios|localStorage|sessionStorage|document\.cookie)\b/,
    );
    expect(checkpoint).toContain("Preview mock-only");
  });
});
