import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_ASSETS } from "@/config/brand-assets";

const frontendRoot = resolve(import.meta.dirname, "../../..");
const brandDir = resolve(frontendRoot, "public/devtalles-brand");

describe("brand assets map", () => {
  it.each(Object.entries(BRAND_ASSETS))("points %s to a vendored file", (_key, src) => {
    expect(src).toMatch(/^\/devtalles-brand\/[a-z-]+\.svg$/);
    expect(existsSync(resolve(frontendRoot, "public", `.${src}`))).toBe(true);
  });

  it("vendors the brand SVG as inert files", () => {
    const files = readdirSync(brandDir).filter((file) => file.endsWith(".svg"));

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const svg = readFileSync(resolve(brandDir, file), "utf8");
      expect(svg, file).toContain("<svg");
      expect(svg, file).not.toMatch(/<script/i);
      expect(svg, file).not.toMatch(/\son[a-z]+\s*=/i);
      expect(svg, file).not.toMatch(/href\s*=/i);
      expect(svg, file).not.toMatch(/url\(/i);
      expect(svg, file).not.toMatch(/<image/i);
      expect(svg, file).not.toMatch(/foreignObject/i);
    }
  });

  it("keeps /devtalles-brand/ out of every source file but the map", () => {
    const sourceRoot = resolve(frontendRoot, "src");
    const offenders = readdirSync(sourceRoot, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(ts|tsx|css)$/.test(file))
      .filter((file) => resolve(sourceRoot, file) !== resolve(sourceRoot, "config/brand-assets.ts"))
      .filter((file) => readFileSync(resolve(sourceRoot, file), "utf8").includes("/devtalles-brand/"));

    expect(offenders).toEqual([]);
  });
});
