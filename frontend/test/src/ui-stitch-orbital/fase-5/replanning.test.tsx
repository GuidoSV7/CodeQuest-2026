import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { replanningFixture } from "@/features/orbital/fixtures";
import {
  initialReplanningState,
  transitionReplanning,
} from "@/features/learning-paths/lib/replanning-state";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("replanning mock preview", () => {
  it("renders before/after and preserves unavailable dates", () => {
    const component = readFrontendFile(
      "src/features/learning-paths/components/ReplanningProposal.tsx",
    );

    expect(replanningFixture.proposedDate).toBeNull();
    expect(component).toContain("Antes");
    expect(component).toContain("Después");
    expect(component).toContain("No disponible");
  });

  it("models local success, error and retry without side effects", () => {
    const component = readFrontendFile(
      "src/features/learning-paths/components/ReplanningProposal.tsx",
    );

    expect(initialReplanningState()).toEqual({ status: "idle", message: null });
    expect(transitionReplanning("accept").status).toBe("success");
    expect(transitionReplanning("simulate-error").status).toBe("error");
    expect(transitionReplanning("retry")).toEqual({
      status: "idle",
      message: null,
    });
    expect(component).not.toMatch(
      /\b(fetch|axios|localStorage|sessionStorage)\b/,
    );
  });
});
