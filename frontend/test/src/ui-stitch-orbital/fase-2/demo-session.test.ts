import { describe, expect, it, vi } from "vitest";
import {
  isOrbitalDemoSessionEnabled,
  resolveOrbitalSession,
  resolveOrbitalSessionRead,
  sessionAfterSignOut,
} from "@/features/auth/lib/demo-session";
import { orbitalDemoSessionFixture } from "@/features/orbital/fixtures";

const NODE_ENVS = ["development", "production", "test", undefined] as const;
const DEMO_SESSIONS = [undefined, "", "true", "1", "false", "0", "TRUE"] as const;
const ENABLED_COMBINATIONS = ["development|true", "development|1"];
const DEMO_MATRIX = NODE_ENVS.flatMap((nodeEnv) =>
  DEMO_SESSIONS.map((demoSession) => ({
    nodeEnv,
    demoSession,
    enabled: ENABLED_COMBINATIONS.includes(`${nodeEnv}|${demoSession}`),
  })),
);

describe("orbital demo session guard", () => {
  it("covers every node env and demo value", () => {
    expect(DEMO_MATRIX).toHaveLength(28);
    expect(DEMO_MATRIX.filter(({ enabled }) => enabled)).toHaveLength(2);
  });

  it.each(DEMO_MATRIX)(
    "enables the fixture only with an explicit opt-in in development (nodeEnv=$nodeEnv, demoSession=$demoSession)",
    ({ nodeEnv, demoSession, enabled }) => {
      expect(isOrbitalDemoSessionEnabled({ nodeEnv, demoSession })).toBe(enabled);
    },
  );

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

describe("orbital demo session read", () => {
  it("returns the authenticated fixture in demo mode without invoking the reader", async () => {
    const readSession = vi.fn().mockRejectedValue(new Error("network blocked"));

    const read = await resolveOrbitalSessionRead(
      { nodeEnv: "development", demoSession: "1" },
      readSession,
    );

    expect(readSession).not.toHaveBeenCalled();
    expect(read).toEqual({ status: "authenticated", user: orbitalDemoSessionFixture });
  });

  it("invokes the real reader exactly once in development without the demo variable", async () => {
    const readSession = vi.fn().mockResolvedValue({ status: "anonymous" });

    const read = await resolveOrbitalSessionRead(
      { nodeEnv: "development", demoSession: undefined },
      readSession,
    );

    expect(readSession).toHaveBeenCalledOnce();
    expect(read).toEqual({ status: "anonymous" });
  });
});
