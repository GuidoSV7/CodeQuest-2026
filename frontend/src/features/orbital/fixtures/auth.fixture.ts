import type { SessionUser } from "@/features/auth/types/auth.types";
import type { OrbitalFixtureMode } from "./modes";

export type AuthFixture = {
  mode: OrbitalFixtureMode;
  user: SessionUser | null;
  errorCode?: "session_unavailable";
};

export const orbitalDemoSessionFixture: SessionUser = {
  id: "orbital-demo-user",
  displayName: "Orbital Demo",
  avatarUrl: null,
  email: null,
};

export const authFixtures: Readonly<Record<OrbitalFixtureMode, AuthFixture>> =
  {
    anonymous: { mode: "anonymous", user: null },
    authenticated: { mode: "authenticated", user: null },
    loading: { mode: "loading", user: null },
    empty: { mode: "empty", user: null },
    error: { mode: "error", user: null, errorCode: "session_unavailable" },
    disabled: { mode: "disabled", user: null },
  };
