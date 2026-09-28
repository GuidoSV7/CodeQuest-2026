import type { OfficialPathId } from "@/config/official-paths";

export type BuildInterest = "web" | "api" | "mobile" | "data" | "bases";
export type SkillLevel = "starting" | "some" | "building";

const PATHS: Record<BuildInterest, Record<SkillLevel, OfficialPathId>> = {
  web: {
    starting: "programas-fundamentos",
    some: "programas-react",
    building: "programas-react",
  },
  api: {
    starting: "programas-node",
    some: "programas-nest",
    building: "programas-nest",
  },
  mobile: {
    starting: "ruta-dart",
    some: "ruta-dart",
    building: "ruta-dart",
  },
  data: {
    starting: "ruta-python",
    some: "ruta-python",
    building: "ruta-ia",
  },
  bases: {
    starting: "programas-fundamentos",
    some: "programas-fundamentos",
    building: "programas-fundamentos",
  },
};

export function suggestOfficialPath(interest: BuildInterest, level: SkillLevel): OfficialPathId {
  return PATHS[interest][level];
}
