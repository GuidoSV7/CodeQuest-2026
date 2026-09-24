import type { OrbitalFixtureMode } from "@/../test/fixtures/ui-stitch-orbital";

export type OrbitalDataMode = "mock";

export type OrbitalDataResult<T> =
  | { status: "ready"; data: T }
  | {
      status:
        | "anonymous"
        | "authenticated"
        | "loading"
        | "empty"
        | "error"
        | "disabled";
      data: null;
      errorCode?: "fixture_unavailable" | "fixture_error";
    };

export type OrbitalFixtureMap<T> = Readonly<
  Record<OrbitalFixtureMode, T | null>
>;
