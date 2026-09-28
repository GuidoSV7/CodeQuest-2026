import { describe, expect, it } from "vitest";
import { ApiError, apiErrorCode, asApiError } from "@/lib/errors";

function httpError(status: number, body: unknown): Error {
  return Object.assign(new Error("http"), { codigoEstado: status, cuerpo: body });
}

describe("asApiError", () => {
  it("maps codigoEstado and cuerpo into statusCode and body", () => {
    const body = { statusCode: 503, code: "CATALOG_UNAVAILABLE", message: "x" };
    const api = asApiError(httpError(503, body));

    expect(api).toBeInstanceOf(ApiError);
    expect(api.statusCode).toBe(503);
    expect(api.body).toBe(body);
  });

  it("uses statusCode 0 and null body for a plain Error", () => {
    const api = asApiError(new Error("Network Error"));

    expect(api.statusCode).toBe(0);
    expect(api.body).toBeNull();
    expect(api.message).toBe("Network Error");
  });

  it("returns the same instance for an ApiError", () => {
    const original = new ApiError("x", 422, { code: "INVALID" });

    expect(asApiError(original)).toBe(original);
  });

  it("uses statusCode 0 for a non-Error value", () => {
    const api = asApiError("boom");

    expect(api.statusCode).toBe(0);
    expect(api.message).toBe("boom");
  });
});

describe("apiErrorCode", () => {
  it("returns the code string from the body", () => {
    expect(apiErrorCode(new ApiError("x", 503, { statusCode: 503, code: "CATALOG_UNAVAILABLE", message: "x" }))).toBe(
      "CATALOG_UNAVAILABLE",
    );
  });

  it("returns null when the body has no code", () => {
    expect(apiErrorCode(new ApiError("x", 503, { statusCode: 503, message: "x" }))).toBeNull();
  });

  it("returns null when code is not a string", () => {
    expect(apiErrorCode(new ApiError("x", 503, { code: 42 }))).toBeNull();
  });

  it("returns null when the body is not an object", () => {
    expect(apiErrorCode(new ApiError("x", 503, null))).toBeNull();
    expect(apiErrorCode(new ApiError("x", 503, "CATALOG_UNAVAILABLE"))).toBeNull();
  });
});
