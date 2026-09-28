import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { OFFICIAL_PATHS, officialPathIconSrc } from "@/config/official-paths";

const frontendRoot = resolve(import.meta.dirname, "../../..");
const iconsDir = resolve(frontendRoot, "public/devtalles-tech");
const backendConfig = resolve(frontendRoot, "../backend/src/modules/catalog-scraper/domain/config.ts");

function backendOfficialPathIds(): string[] {
  const source = readFileSync(backendConfig, "utf8");
  const block = source.match(/OFFICIAL_PATH_IDS = \[([\s\S]*?)\]/)?.[1] ?? "";
  return Array.from(block.matchAll(/'([^']+)'/g), (match) => match[1]);
}

describe("official paths map", () => {
  it("lists the same official path ids as the backend, in order", () => {
    expect(OFFICIAL_PATHS.map((path) => path.id)).toEqual(backendOfficialPathIds());
  });

  it.each(OFFICIAL_PATHS.map((path) => path.id))("points %s to a vendored icon", (id) => {
    const src = officialPathIconSrc(id);

    expect(src).toMatch(/^\/devtalles-tech\/[a-z-]+\.svg$/);
    expect(existsSync(resolve(frontendRoot, "public", `.${src}`))).toBe(true);
  });

  it("returns null for an unknown or missing path id", () => {
    expect(officialPathIconSrc("desconocido")).toBeNull();
    expect(officialPathIconSrc(null)).toBeNull();
  });

  it("vendors the 14 stack icons as inert SVG", () => {
    const icons = readdirSync(iconsDir).filter((file) => file.endsWith(".svg"));

    expect(icons).toHaveLength(14);
    for (const icon of icons) {
      const svg = readFileSync(resolve(iconsDir, icon), "utf8");
      expect(svg.trimStart(), icon).toMatch(/^(<\?xml|<svg)/);
      expect(svg, icon).toContain("<svg");
      expect(svg, icon).not.toMatch(/<script/i);
      expect(svg, icon).not.toMatch(/\son[a-z]+\s*=/i);
      expect(svg, icon).not.toMatch(/href\s*=\s*["']\s*javascript:/i);
    }
  });

  it("keeps /devtalles-tech/ out of every source file but the map", () => {
    const sourceRoot = resolve(frontendRoot, "src");
    const offenders = readdirSync(sourceRoot, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(ts|tsx|css)$/.test(file))
      .filter((file) => resolve(sourceRoot, file) !== resolve(sourceRoot, "config/official-paths.ts"))
      .filter((file) => readFileSync(resolve(sourceRoot, file), "utf8").includes("/devtalles-tech/"));

    expect(offenders).toEqual([]);
  });
});
