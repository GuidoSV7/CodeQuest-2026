import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

const GATED_LAYOUTS = [
  "src/app/(producto)/mis-rutas/layout.tsx",
  "src/app/(producto)/configurador-de-ruta/layout.tsx",
] as const;

const PUBLIC_FILES = [
  "src/app/(producto)/layout.tsx",
  "src/app/(producto)/page.tsx",
  "src/app/(producto)/docs/mcp/page.tsx",
] as const;

describe("session gate layouts", () => {
  it.each(GATED_LAYOUTS)("%s is a Server Component that wraps children in RequireSession", (file) => {
    const source = readFrontendFile(file);

    expect(source).not.toMatch(/["']use client["']/);
    expect(source).toMatch(/import \{ RequireSession \} from "@\/features\/auth\/components\/RequireSession"/);
    expect(source).toMatch(/<RequireSession>\{children\}<\/RequireSession>/);
  });

  it.each(PUBLIC_FILES)("%s stays public (no RequireSession)", (file) => {
    expect(readFrontendFile(file)).not.toMatch(/\bRequireSession\b/);
  });
});
