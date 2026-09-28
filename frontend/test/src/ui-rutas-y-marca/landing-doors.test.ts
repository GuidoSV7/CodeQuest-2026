import { describe, expect, it } from "vitest";
import { OFFICIAL_PATHS } from "@/config/official-paths";
import { landingFixture } from "@/features/orbital/fixtures";

const doorsById = Object.fromEntries(landingFixture.doors.map((door) => [door.id, door]));

describe("landing doors deep link", () => {
  it("links each door to the configurator form with its path preselected", () => {
    expect(doorsById.start.href).toBe("/configurador-de-ruta?panel=form&path=programas-fundamentos");
    expect(doorsById.switch.href).toBe("/configurador-de-ruta?panel=form&path=programas-react");
    expect(doorsById.specialize.href).toBe("/configurador-de-ruta?panel=form&path=programas-nest");
    expect(doorsById.unknown.href).toBe("/configurador-de-ruta?panel=form&path=programas-fundamentos");
  });

  it("only points to official paths", () => {
    const officialIds: readonly string[] = OFFICIAL_PATHS.map((path) => path.id);
    for (const door of landingFixture.doors) {
      const url = new URL(door.href, "http://localhost");
      expect(url.pathname).toBe("/configurador-de-ruta");
      expect(url.searchParams.get("panel")).toBe("form");
      expect(officialIds).toContain(url.searchParams.get("path"));
    }
  });

  it("declares the stack icon explicitly and leaves the unknown door without one", () => {
    expect(doorsById.start.stackPathId).toBe("programas-fundamentos");
    expect(doorsById.switch.stackPathId).toBe("programas-react");
    expect(doorsById.specialize.stackPathId).toBe("programas-nest");
    expect(doorsById.unknown.stackPathId).toBeNull();
  });

  it("sends the unknown door to Fundamentos and still mentions the MCP", () => {
    expect(doorsById.unknown.metadata).toEqual(["Nivel", "Inicial"]);
    expect(doorsById.unknown.description).toContain("Fundamentos");
    expect(doorsById.unknown.description).toContain("MCP");
  });
});
