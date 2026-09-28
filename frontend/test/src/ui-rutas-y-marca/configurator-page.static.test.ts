import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(import.meta.dirname, "../../../src/app/(producto)/configurador-de-ruta/page.tsx"),
  "utf8",
);

describe("configurador-de-ruta page", () => {
  it("reads the deep link on the server without client-only search params", () => {
    expect(source).not.toContain('"use client"');
    expect(source).not.toContain("useSearchParams");
    expect(source).toContain("await searchParams");
    expect(source).toContain("parseConfiguratorDeepLink");
  });
});
