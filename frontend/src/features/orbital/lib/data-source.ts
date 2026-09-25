import {
  ORBITAL_MODES,
  type OrbitalFixtureMode,
} from "@/features/orbital/fixtures";
import type {
  OrbitalDataMode,
  OrbitalDataResult,
  OrbitalFixtureMap,
} from "../types/orbital.types";

export const DATA_MODE: OrbitalDataMode = "mock";

function isOrbitalFixtureMode(value: string): value is OrbitalFixtureMode {
  return ORBITAL_MODES.some((mode) => mode === value);
}

export class OrbitalDataSource<T> {
  public constructor(private readonly fixtures: OrbitalFixtureMap<T>) {}

  public read(mode: string): OrbitalDataResult<T> {
    if (!isOrbitalFixtureMode(mode)) {
      return {
        status: "error",
        data: null,
        errorCode: "fixture_unavailable",
      };
    }

    const value = this.fixtures[mode];
    if (mode === "error") {
      return { status: "error", data: null, errorCode: "fixture_error" };
    }
    if (value === null) {
      return { status: mode, data: null };
    }

    return { status: "ready", data: value };
  }
}
