import { describe, expect, it } from "vitest";
import {
  classifyRouteCreateError,
  classifyRouteLoadError,
} from "@/features/learning-paths/lib/route-errors";

// Shape actual de AllExceptionsFilter del backend, copiado a mano (deuda D-3).
function httpError(statusCode: number, code?: string): Error {
  return Object.assign(new Error("http"), {
    codigoEstado: statusCode,
    cuerpo: { statusCode, code, message: "x" },
  });
}

describe("classifyRouteLoadError", () => {
  it("classifies 401 as unauthorized", () => {
    expect(classifyRouteLoadError(httpError(401, "UNAUTHORIZED"))).toBe("unauthorized");
  });

  it.each([
    ["network (no response)", new Error("Network Error")],
    ["500", httpError(500, "INTERNAL")],
    ["503", httpError(503, "CATALOG_UNAVAILABLE")],
    ["422", httpError(422, "INVALID")],
    ["non-Error value", "boom"],
  ])("classifies %s as failed", (_label, error) => {
    expect(classifyRouteLoadError(error)).toBe("failed");
  });
});

describe("classifyRouteCreateError", () => {
  it("classifies 401 as unauthorized", () => {
    expect(classifyRouteCreateError(httpError(401, "UNAUTHORIZED"))).toBe("unauthorized");
  });

  it("classifies 503 with CATALOG_UNAVAILABLE as catalog-unavailable", () => {
    expect(classifyRouteCreateError(httpError(503, "CATALOG_UNAVAILABLE"))).toBe(
      "catalog-unavailable",
    );
  });

  it.each([
    ["503 without code", httpError(503)],
    ["503 with another code", httpError(503, "SERVICE_DOWN")],
    ["422", httpError(422, "INVALID")],
    ["400", httpError(400, "BAD_REQUEST")],
    ["network (no response)", new Error("Network Error")],
    ["non-Error value", "boom"],
  ])("classifies %s as failed", (_label, error) => {
    expect(classifyRouteCreateError(error)).toBe("failed");
  });
});
