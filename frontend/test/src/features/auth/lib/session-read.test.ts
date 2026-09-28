import { describe, expect, it } from "vitest";
import { classifySessionReadError, parseSessionUser } from "@/features/auth/lib/session-read";

const user = {
  id: "7f1c2a9e-0b4d-4c61-9a52-3e8f1d6b2c70",
  displayName: "Ada Lovelace",
  avatarUrl: null,
  email: null,
};

function httpError(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { codigoEstado: status, cuerpo: null });
}

describe("parseSessionUser", () => {
  it("accepts a user with null avatar and email", () => {
    expect(parseSessionUser(user)).toEqual(user);
  });

  it("accepts a user with string avatar and email", () => {
    const withContact = { ...user, avatarUrl: "https://cdn.example/a.png", email: "ada@example.com" };
    expect(parseSessionUser(withContact)).toEqual(withContact);
  });

  it.each([
    ["null", null],
    ["empty object", {}],
    ["numeric id", { id: 1 }],
    ["empty id", { ...user, id: "" }],
    ["missing avatarUrl", { id: user.id, displayName: user.displayName, email: null }],
    ["missing email", { id: user.id, displayName: user.displayName, avatarUrl: null }],
    ["non-string displayName", { ...user, displayName: 7 }],
    ["string body", "Ada"],
  ])("rejects %s", (_label, body) => {
    expect(parseSessionUser(body)).toBeNull();
  });
});

describe("classifySessionReadError", () => {
  it.each([401, 403])("classifies %i as anonymous", (status) => {
    expect(classifySessionReadError(httpError(status))).toEqual({ status: "anonymous" });
  });

  it.each([0, 500, 503, 404, 429])("classifies %i as unreachable", (status) => {
    expect(classifySessionReadError(httpError(status))).toEqual({ status: "unreachable" });
  });

  it("classifies an error without status code as unreachable", () => {
    expect(classifySessionReadError(new Error("Network Error"))).toEqual({ status: "unreachable" });
  });

  it("classifies a non-Error value as unreachable", () => {
    expect(classifySessionReadError("boom")).toEqual({ status: "unreachable" });
  });
});
