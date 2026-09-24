import { describe, expect, it, vi } from "vitest";
import {
  isOrbitalDemoSessionEnabled,
  resolveOrbitalSession,
} from "@/features/auth/lib/demo-session";

describe("orbital demo session guard", () => {
  it("only enables the fixture in development with the explicit 1 flag", () => {
    expect(
      isOrbitalDemoSessionEnabled({
        nodeEnv: "development",
        demoSession: "1",
      }),
    ).toBe(true);
    expect(
      isOrbitalDemoSessionEnabled({
        nodeEnv: "production",
        demoSession: "1",
      }),
    ).toBe(false);
    expect(
      isOrbitalDemoSessionEnabled({
        nodeEnv: "development",
        demoSession: "true",
      }),
    ).toBe(false);
    expect(
      isOrbitalDemoSessionEnabled({
        nodeEnv: "development",
        demoSession: undefined,
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
      id: "orbital-demo-user",
      displayName: "Orbital Demo",
      avatarUrl: null,
      email: null,
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
});
