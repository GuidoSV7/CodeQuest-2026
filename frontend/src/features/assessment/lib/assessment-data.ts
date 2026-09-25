import {
  ORBITAL_MODES,
  assessmentFixtures,
  type OrbitalFixtureMode,
} from "@/features/orbital/fixtures";
import type { AssessmentDataResult } from "../types/assessment.types";

function isFixtureMode(value: string): value is OrbitalFixtureMode {
  return ORBITAL_MODES.some((mode) => mode === value);
}

export function getAssessment(mode: OrbitalFixtureMode | string): AssessmentDataResult {
  if (!isFixtureMode(mode)) {
    return { status: "error", data: null, errorCode: "fixture_unavailable" };
  }
  if (mode === "error") {
    return { status: "error", data: null, errorCode: "fixture_error" };
  }
  const fixture = assessmentFixtures[mode];
  if (fixture === null) {
    if (mode === "loading" || mode === "empty" || mode === "disabled") {
      return { status: mode, data: null };
    }
    return { status: "error", data: null, errorCode: "fixture_unavailable" };
  }
  return { status: "ready", data: fixture };
}
