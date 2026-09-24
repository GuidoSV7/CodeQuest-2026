import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("existing root and home landmarks", () => {
  it("keeps the root layout as a server component with the existing providers", () => {
    const layout = readFrontendFile("src/app/layout.tsx");

    expect(layout).not.toMatch(/^["']use client["'];/);
    expect(layout).toContain('lang="es"');
    expect(layout).toContain("<body");
    expect(layout).toContain("<ProveedoresApp>");
    expect(layout).toContain("<ProveedorNotificaciones>");
  });

  it("keeps the home entrypoint, Discord navigation and auth status landmark", () => {
    const page = readFrontendFile("src/app/(producto)/page.tsx");

    expect(page).toContain('from "next/link"');
    expect(page).toContain("landingFixture");
    expect(page).toContain("<HomeAuthStatus />");
    expect(page).toContain("<main");
  });
});
