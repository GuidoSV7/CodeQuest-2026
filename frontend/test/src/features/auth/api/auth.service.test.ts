import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  discordStartUrl,
  fetchMe,
  fetchMeStatus,
  SESSION_READ_TIMEOUT_MS,
} from "@/features/auth/api/auth.service";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/axios", () => ({ default: { get } }));

const user = {
  id: "e325e61b-e895-49a9-ae24-aa3a379fecc4",
  displayName: "Guido Salazar",
  avatarUrl: null,
  email: null,
};

function httpError(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { codigoEstado: status, cuerpo: null });
}

describe("discordStartUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("points at the public API Discord start route", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_URL",
      "https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io",
    );
    expect(discordStartUrl()).toBe(
      "https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io/api/auth/discord/start",
    );
    expect(discordStartUrl("/dashboard")).toBe(
      "https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io/api/auth/discord/start?returnTo=%2Fdashboard",
    );
  });
});

describe("fetchMe (caracterización)", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("returns the user from a 200 response", async () => {
    get.mockResolvedValue({ data: user });
    await expect(fetchMe()).resolves.toEqual(user);
    expect(get).toHaveBeenCalledWith("/api/auth/me");
  });

  it("returns null when the API answers 401", async () => {
    get.mockRejectedValue(httpError(401));
    await expect(fetchMe()).resolves.toBeNull();
  });

  it("returns null when the request gets no response", async () => {
    get.mockRejectedValue(new Error("Network Error"));
    await expect(fetchMe()).resolves.toBeNull();
  });
});

describe("fetchMeStatus", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("reads /me with an explicit 8 second timeout", async () => {
    get.mockResolvedValue({ data: user });
    await fetchMeStatus();
    expect(SESSION_READ_TIMEOUT_MS).toBe(8_000);
    expect(get).toHaveBeenCalledWith("/api/auth/me", { timeout: 8000 });
  });

  it("returns authenticated with the user from a valid 200 body", async () => {
    get.mockResolvedValue({ data: user });
    await expect(fetchMeStatus()).resolves.toEqual({ status: "authenticated", user });
  });

  it.each([401, 403])("returns anonymous on %i", async (status) => {
    get.mockRejectedValue(httpError(status));
    await expect(fetchMeStatus()).resolves.toEqual({ status: "anonymous" });
  });

  it.each([
    ["network failure", new Error("Network Error")],
    ["timeout", Object.assign(new Error("timeout of 8000ms exceeded"), { code: "ECONNABORTED" })],
    ["500", httpError(500)],
    ["503", httpError(503)],
    ["404", httpError(404)],
  ])("returns unreachable on %s", async (_label, error) => {
    get.mockRejectedValue(error);
    await expect(fetchMeStatus()).resolves.toEqual({ status: "unreachable" });
  });

  it.each([
    ["null", null],
    ["empty object", {}],
    ["numeric id", { id: 1 }],
    ["empty id", { ...user, id: "" }],
    ["missing avatarUrl", { id: user.id, displayName: user.displayName, email: null }],
  ])("returns unreachable when the 200 body is %s", async (_label, data) => {
    get.mockResolvedValue({ data });
    await expect(fetchMeStatus()).resolves.toEqual({ status: "unreachable" });
  });
});
