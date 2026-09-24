import { describe, expect, it } from "vitest";
import { authFixtures, ORBITAL_MODES } from "@/../test/fixtures/ui-stitch-orbital";

describe("Orbital fixture boundary", () => {
  it("defines every presentation mode without sensitive or external data", () => {
    expect(Object.keys(authFixtures).sort()).toEqual([...ORBITAL_MODES].sort());

    for (const fixture of Object.values(authFixtures)) {
      expect(fixture.user).toBeNull();
      expect(JSON.stringify(fixture)).not.toMatch(
        /(token|secret|password|authorization|https?:\/\/|fetch)/i,
      );
    }
  });
});
