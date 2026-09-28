import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoot = resolve(import.meta.dirname, "../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function cssBlock(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `missing CSS block ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start) + 1);
}

describe("configurator layout", () => {
  it("centers the configurator in a reading-width column", () => {
    const css = readFrontendFile("src/app/(producto)/configurador-de-ruta/page.module.css");

    expect(css).toContain("width: min(100%, 48rem)");
  });

  it("stops pinning the configurator buttons to the left and drops the video placeholder", () => {
    const css = readFrontendFile("src/features/learning-paths/components/MyRouteStatus.module.css");

    expect(css).not.toMatch(/\.choice,\s*\.form button,\s*\.dialog button\s*\{[^}]*justify-self:\s*start/s);
    expect(css).not.toContain("videoSlot");
  });
});

describe("path diagram headings in sentence case", () => {
  const css = readFrontendFile("path-diagram/src/path-diagram.module.css");

  it("column headers and modal section titles are not uppercased", () => {
    expect(cssBlock(css, ".header,\n.groupLabel")).not.toContain("text-transform: uppercase");
    expect(cssBlock(css, ".dialog h3")).not.toContain("text-transform: uppercase");
  });

  it("course tags are capitalized", () => {
    expect(cssBlock(css, ".tags li")).toContain("text-transform: capitalize");
  });

  it("layout labels are not written in capitals", () => {
    const source = readFrontendFile("path-diagram/src/layout-path.ts");

    expect(source).not.toMatch(/REQUERIDO|RECOMENDADO|OPCIONAL|EN CUALQUIER MOMENTO/);
  });
});
