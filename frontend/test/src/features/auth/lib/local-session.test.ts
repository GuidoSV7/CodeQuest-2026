import { describe, expect, it, vi } from "vitest";
import { captureLocalSessionFromLocation, loginReturnTarget, readLocalSessionToken } from "@/features/auth/lib/local-session";

describe("local session handoff", () => {
  it("stores the fragment token and removes it from the address", () => {
    const storage = new Map<string, string>();
    const replace = vi.fn();
    captureLocalSessionFromLocation(
      {
        hash: "#cq_session=abc.def",
        pathname: "/configurador-de-ruta",
        search: "",
      } as Location,
      {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      } as Storage,
      replace,
    );
    expect(readLocalSessionToken({
      getItem: (key) => storage.get(key) ?? null,
    } as Storage)).toBe("abc.def");
    expect(replace).toHaveBeenCalledWith("/configurador-de-ruta");
  });

  it("asks Discord to return to localhost when the app is local", () => {
    expect(loginReturnTarget("http://localhost:3000", "/configurador-de-ruta")).toBe(
      "http://localhost:3000/configurador-de-ruta",
    );
    expect(loginReturnTarget("https://app.example.com", "/mis-rutas")).toBe("/mis-rutas");
  });
});
