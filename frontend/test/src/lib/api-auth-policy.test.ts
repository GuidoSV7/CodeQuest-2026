import { describe, expect, it } from "vitest";
import { mapApiResponseError } from "@/lib/api-auth-policy";

describe("mapApiResponseError", () => {
  it("copies status and body from an HTTP response into codigoEstado and cuerpo", () => {
    const body = { statusCode: 401, code: "UNAUTHORIZED", message: "Sesión requerida" };
    const mapped = mapApiResponseError({
      message: "Request failed with status code 401",
      response: { status: 401, data: body },
    }) as Error & { codigoEstado?: number; cuerpo?: unknown };

    expect(mapped).toBeInstanceOf(Error);
    expect(mapped.message).toBe("Sesión requerida");
    expect(mapped.codigoEstado).toBe(401);
    expect(mapped.cuerpo).toBe(body);
  });

  it("returns an error without codigoEstado when there is no response", () => {
    const network = new Error("Network Error");
    const mapped = mapApiResponseError(network) as Error & { codigoEstado?: number };

    expect(mapped).toBe(network);
    expect(mapped.codigoEstado).toBeUndefined();
  });

  it("wraps a non-Error rejection without codigoEstado", () => {
    const mapped = mapApiResponseError("boom") as Error & { codigoEstado?: number };

    expect(mapped).toBeInstanceOf(Error);
    expect(mapped.message).toBe("boom");
    expect(mapped.codigoEstado).toBeUndefined();
  });
});
