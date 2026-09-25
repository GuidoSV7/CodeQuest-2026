import {
  learningPathFixtures,
  type OrbitalFixtureMode,
} from "@/features/orbital/fixtures";
import { OrbitalDataSource } from "@/features/orbital/lib/data-source";
import type { LearningPathCollection } from "../types/learning-path.types";

export const learningPathsData = new OrbitalDataSource<LearningPathCollection>(
  learningPathFixtures,
);

export function getLearningPaths(mode: OrbitalFixtureMode | string) {
  return learningPathsData.read(mode);
}
