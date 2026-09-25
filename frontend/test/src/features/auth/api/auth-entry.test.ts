import { describe, expect, it, vi, afterEach } from "vitest";
import {
  authEntryPath,
  discordStartUrl,
} from "@/features/auth/api/auth.service";

describe("discord auth entries", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends login and register through the same Discord start URL", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_API_URL",
      "https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io",
    );
    const start = discordStartUrl("/mis-rutas");
    expect(start).toBe(
      "https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io/api/auth/discord/start?returnTo=%2Fmis-rutas",
    );
    expect(authEntryPath("login")).toBe("/login");
    expect(authEntryPath("register")).toBe("/registro");
  });
});
