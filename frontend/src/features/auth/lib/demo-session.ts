import { orbitalDemoSessionFixture } from "@/features/orbital/fixtures";
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
  return environment.nodeEnv === "development";
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

const SIGNED_OUT_KEY = "cq_signed_out";

export function readSignedOut(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(SIGNED_OUT_KEY) === "1";
}

export function markSignedOut(): void {
  sessionStorage.setItem(SIGNED_OUT_KEY, "1");
}

export function clearSignedOut(): void {
  sessionStorage.removeItem(SIGNED_OUT_KEY);
}

export function sessionAfterSignOut<T>(user: T | null, signedOut: boolean): T | null {
  return signedOut ? null : user;
}
