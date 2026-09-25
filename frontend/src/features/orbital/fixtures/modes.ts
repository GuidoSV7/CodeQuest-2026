export const ORBITAL_MODES = [
  "anonymous",
  "authenticated",
  "loading",
  "empty",
  "error",
  "disabled",
] as const;

export type OrbitalFixtureMode = (typeof ORBITAL_MODES)[number];
