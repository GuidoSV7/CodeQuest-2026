import { describe, expect, it, vi, afterEach } from "vitest";
import {
  discordStartUrl,
} from "@/features/auth/api/auth.service";

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
