import { describe, expect, it } from "vitest";
import { DATA_MODE, OrbitalDataSource } from "./data-source";

describe("OrbitalDataSource", () => {
  const source = new OrbitalDataSource({
    anonymous: null,
    authenticated: "local fixture",
    loading: null,
    empty: null,
    error: null,
    disabled: null,
  });

  it("uses mock mode and returns a ready local fixture", () => {
    expect(DATA_MODE).toBe("mock");
    expect(source.read("authenticated")).toEqual({
      status: "ready",
      data: "local fixture",
    });
  });

  it("exposes empty, loading, disabled and error states", () => {
    expect(source.read("empty")).toEqual({ status: "empty", data: null });
    expect(source.read("loading")).toEqual({ status: "loading", data: null });
    expect(source.read("disabled")).toEqual({ status: "disabled", data: null });
    expect(source.read("error")).toEqual({
      status: "error",
      data: null,
      errorCode: "fixture_error",
    });
  });

  it("returns a visible typed result for an absent fixture mode", () => {
    expect(source.read("missing")).toEqual({
      status: "error",
      data: null,
      errorCode: "fixture_unavailable",
    });
  });

  it("does not reference request or persistent storage APIs", () => {
    expect(source.read.toString()).not.toMatch(/\b(fetch|axios|localStorage|sessionStorage)\b/);
  });
});
