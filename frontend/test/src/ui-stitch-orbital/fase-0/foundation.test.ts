import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("Orbital foundation", () => {
  it("defines global tokens, focus, browser surfaces and reduced motion", () => {
    const globals = readFrontendFile("src/app/globals.css");

    expect(globals).toContain("--orbital-cosmos");
    expect(globals).toContain("--orbital-panel");
    expect(globals).toContain("--orbital-lime");
    expect(globals).toContain("--orbital-focus");
    expect(globals).toContain("--orbital-radius-md");
    expect(globals).toContain("--orbital-shadow-panel");
    expect(globals).toContain("::selection");
    expect(globals).toContain("scrollbar-color");
    expect(globals).toContain("prefers-reduced-motion");
    expect(globals).not.toMatch(/class(Name)?=.*(text-|bg-|flex|grid)-/);
  });

  it("keeps approved fonts in the server layout", () => {
    const layout = readFrontendFile("src/app/layout.tsx");

    expect(layout).toContain('from "next/font/google"');
    expect(layout).toContain("Outfit");
    expect(layout).toContain("Raleway");
    expect(layout).toContain("Space_Mono");
    expect(layout).not.toMatch(/^["']use client["'];/);
  });

  it("exposes the shared mission shell and approved development origin", () => {
    const layout = readFrontendFile("src/app/layout.tsx");
    const productoLayout = readFrontendFile("src/app/(producto)/layout.tsx");
    const accesoLayout = readFrontendFile("src/app/(acceso)/layout.tsx");
    const shell = readFrontendFile(
      "src/features/orbital/components/MissionShell.tsx",
    );
    const nextConfig = readFrontendFile("next.config.ts");

    // ui.shell.not_in_root
    expect(layout).not.toContain("<MissionShell>");
    expect(layout).not.toContain("MissionShell");
    // ui.shell.in_groups
    expect(productoLayout).toContain("<MissionShell>");
    expect(accesoLayout).toContain('<MissionShell variant="login">');
    expect(shell).toContain('href="#orbital-content"');
    expect(shell).toContain('aria-label="Navegación principal"');
    expect(nextConfig).toContain('allowedDevOrigins: ["10.110.100.99"]');
  });
});
