import { orbitalDemoSessionFixture } from "@/../test/fixtures/ui-stitch-orbital";
import type { SessionUser } from "../types/auth.types";

export type OrbitalDemoEnvironment = Readonly<{
  nodeEnv: string | undefined;
  demoSession: string | undefined;
}>;

export type SessionReader = () => Promise<SessionUser | null>;

export function isOrbitalDemoSessionEnabled(
  environment: OrbitalDemoEnvironment = {
    nodeEnv: process.env.NODE_ENV,
    demoSession: process.env.NEXT_PUBLIC_ORBITAL_DEMO_SESSION,
  },
): boolean {
  return (
    environment.nodeEnv === "development" && environment.demoSession === "1"
  );
}

export function resolveOrbitalSession(
  environment: OrbitalDemoEnvironment,
  readSession: SessionReader,
): Promise<SessionUser | null> {
  if (isOrbitalDemoSessionEnabled(environment)) {
    return Promise.resolve(orbitalDemoSessionFixture);
  }

  return readSession();
}
