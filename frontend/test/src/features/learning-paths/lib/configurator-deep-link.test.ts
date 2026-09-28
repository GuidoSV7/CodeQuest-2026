import { describe, expect, it } from "vitest";
import { OFFICIAL_PATHS } from "@/config/official-paths";
import { parseConfiguratorDeepLink } from "@/features/learning-paths/lib/configurator-deep-link";

const DEFAULT_PATH = OFFICIAL_PATHS[0].id;

describe("parseConfiguratorDeepLink", () => {
  it("opens the form with the requested official path", () => {
    expect(parseConfiguratorDeepLink({ panel: "form", path: "programas-react" })).toEqual({
      initialPanel: "form",
      initialPathId: "programas-react",
    });
  });

  it("falls back to the defaults when no params are present", () => {
    expect(parseConfiguratorDeepLink({})).toEqual({
      initialPanel: "none",
      initialPathId: DEFAULT_PATH,
    });
  });

  it("preselects the path with the form closed when panel is missing", () => {
    expect(parseConfiguratorDeepLink({ path: "programas-nest" })).toEqual({
      initialPanel: "none",
      initialPathId: "programas-nest",
    });
  });

  it.each([
    ["unknown id", "programas-cobol"],
    ["path traversal", "../x"],
    ["empty string", ""],
    ["array", ["programas-react", "programas-nest"]],
  ])("ignores an invalid path (%s)", (_label, path) => {
    expect(parseConfiguratorDeepLink({ panel: "form", path })).toEqual({
      initialPanel: "form",
      initialPathId: DEFAULT_PATH,
    });
  });

  it.each([
    ["mcp", "mcp"],
    ["uppercase", "FORM"],
    ["empty string", ""],
    ["array", ["form"]],
  ])("ignores an invalid panel (%s)", (_label, panel) => {
    expect(parseConfiguratorDeepLink({ panel, path: "programas-react" })).toEqual({
      initialPanel: "none",
      initialPathId: "programas-react",
    });
  });
});
