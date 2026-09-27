import { describe, expect, it, vi } from "vitest";
import {
  isOrbitalDemoSessionEnabled,
  resolveOrbitalSession,
  sessionAfterSignOut,
} from "@/features/auth/lib/demo-session";

describe("orbital demo session guard", () => {
  it("enables the fixture for every development session and never in production", () => {
    expect(
      isOrbitalDemoSessionEnabled({
        nodeEnv: "development",
        demoSession: undefined,
      }),
    ).toBe(true);
    expect(
      isOrbitalDemoSessionEnabled({
        nodeEnv: "development",
        demoSession: "true",
      }),
    ).toBe(true);
    expect(
      isOrbitalDemoSessionEnabled({
        nodeEnv: "production",
        demoSession: "1",
      }),
    ).toBe(false);
  });

  it("does not invoke the session reader in demo mode", async () => {
    const readSession = vi.fn().mockRejectedValue(new Error("network blocked"));

    const user = await resolveOrbitalSession(
      { nodeEnv: "development", demoSession: "1" },
      readSession,
    );

    expect(readSession).not.toHaveBeenCalled();
    expect(user).toEqual({
      id: "e325e61b-e895-49a9-ae24-aa3a379fecc4",
      displayName: "Guido Salazar",
      avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
      email: "guido.salazar.vargas7@gmail.com",
    });
  });

  it("keeps the real session reader outside demo mode", async () => {
    const readSession = vi.fn().mockResolvedValue(null);

    await resolveOrbitalSession(
      { nodeEnv: "production", demoSession: "1" },
      readSession,
    );

    expect(readSession).toHaveBeenCalledOnce();
  });

  it("drops the default session after the user signs out", () => {
    const user = {
      id: "e325e61b-e895-49a9-ae24-aa3a379fecc4",
      displayName: "Guido Salazar",
      avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
      email: "guido.salazar.vargas7@gmail.com",
    };

    expect(sessionAfterSignOut(user, true)).toBeNull();
    expect(sessionAfterSignOut(user, false)).toEqual(user);
  });
});
