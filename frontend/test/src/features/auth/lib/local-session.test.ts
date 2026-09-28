import { describe, expect, it, vi } from "vitest";
import {
  captureLocalSessionFromLocation,
  clearLocalSessionToken,
  loginReturnTarget,
  readLocalSessionToken,
} from "@/features/auth/lib/local-session";

describe("local session handoff", () => {
  it("stores the fragment token and removes it from the address", () => {
    const storage = new Map<string, string>();
    const replace = vi.fn();
    captureLocalSessionFromLocation(
      {
        hash: "#cq_session=abc.def",
        pathname: "/configurador-de-ruta",
        search: "",
      },
      {
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
      replace,
    );
    expect(readLocalSessionToken({
      getItem: (key) => storage.get(key) ?? null,
    })).toBe("abc.def");
    expect(replace).toHaveBeenCalledWith("/configurador-de-ruta");
  });

  it("does nothing when the fragment has no session token", () => {
    const setItem = vi.fn();
    const replace = vi.fn();
    captureLocalSessionFromLocation(
      { hash: "#tab=2", pathname: "/mis-rutas", search: "" },
      { setItem },
      replace,
    );
    expect(setItem).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the rest of the fragment after removing the session token", () => {
    const setItem = vi.fn();
    const replace = vi.fn();
    captureLocalSessionFromLocation(
      { hash: "#cq_session=x&tab=2", pathname: "/mis-rutas", search: "?a=1" },
      { setItem },
      replace,
    );
    expect(setItem).toHaveBeenCalledWith("cq_session_token", "x");
    expect(replace).toHaveBeenCalledWith("/mis-rutas?a=1#tab=2");
  });

  it("reads no token without storage", () => {
    expect(readLocalSessionToken(undefined)).toBeNull();
  });

  it("removes the stored session token", () => {
    const removeItem = vi.fn();
    clearLocalSessionToken({ removeItem });
    expect(removeItem).toHaveBeenCalledWith("cq_session_token");
  });

  it("asks Discord to return to localhost when the app is local", () => {
    expect(loginReturnTarget("http://localhost:3000", "/configurador-de-ruta")).toBe(
      "http://localhost:3000/configurador-de-ruta",
    );
    expect(loginReturnTarget("https://app.example.com", "/mis-rutas")).toBe("/mis-rutas");
  });
});
