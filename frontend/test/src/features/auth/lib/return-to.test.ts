import { describe, expect, it } from "vitest";
import { sessionReturnTo } from "@/features/auth/lib/return-to";

describe("sessionReturnTo", () => {
  it("returns the path when the URL has no query", () => {
    expect(sessionReturnTo("/mis-rutas", { pathname: "/mis-rutas", search: "" })).toBe("/mis-rutas");
  });

  it("keeps the query when the URL already points at the rendered path", () => {
    expect(
      sessionReturnTo("/configurador-de-ruta", {
        pathname: "/configurador-de-ruta",
        search: "?panel=form&path=programas-react",
      }),
    ).toBe("/configurador-de-ruta?panel=form&path=programas-react");
  });

  it("returns only the path when the URL is not committed yet", () => {
    expect(sessionReturnTo("/mis-rutas", { pathname: "/", search: "?ref=landing" })).toBe("/mis-rutas");
  });

  it("never includes the hash", () => {
    const location = { pathname: "/mis-rutas", search: "?a=1", hash: "#cq_session=secret" };
    expect(sessionReturnTo("/mis-rutas", location)).toBe("/mis-rutas?a=1");
  });
});
