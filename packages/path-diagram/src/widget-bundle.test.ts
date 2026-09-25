import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../dist/path-diagram.html", import.meta.url), "utf8");

describe("path diagram widget bundle", () => {
  it("stays within the size budget and has no external urls", () => {
    expect(statSync(new URL("../dist/path-diagram.html", import.meta.url)).size).toBeLessThanOrEqual(2 * 1024 * 1024);
    const withoutXmlns = html.replaceAll("http://www.w3.org/2000/svg", "").replaceAll("http://www.w3.org/1999/xlink", "");
    expect(withoutXmlns).not.toMatch(/https?:\/\//);
  });
});
