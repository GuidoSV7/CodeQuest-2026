import type { SessionUser } from "@/features/auth/types/auth.types";
import type { OrbitalFixtureMode } from "./modes";

export type AuthFixture = {
  mode: OrbitalFixtureMode;
  user: SessionUser | null;
  errorCode?: "session_unavailable";
};

export const orbitalDemoSessionFixture: SessionUser = {
  id: "e325e61b-e895-49a9-ae24-aa3a379fecc4",
  displayName: "Guido Salazar",
  avatarUrl: "https://cdn.discordapp.com/embed/avatars/0.png",
  email: "guido.salazar.vargas7@gmail.com",
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
