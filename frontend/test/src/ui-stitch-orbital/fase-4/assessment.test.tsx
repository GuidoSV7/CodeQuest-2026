import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assessmentFixtures } from "@/../test/fixtures/ui-stitch-orbital";
import { getAssessment } from "@/features/assessment/lib/assessment-data";
import { answerQuestion, canAdvance } from "@/features/assessment/lib/assessment-state";

const frontendRoot = resolve(import.meta.dirname, "../../../..");

function readFrontendFile(relativePath: string): string {
  return readFileSync(resolve(frontendRoot, relativePath), "utf8");
}

describe("local assessment flow", () => {
  it("uses the allowlisted fixture and requires one answer per step", () => {
    const wizard = readFrontendFile(
      "src/features/assessment/components/AssessmentWizard.tsx",
    );
    const answers = answerQuestion({}, "saturday-vector", "inv-data");

    expect(getAssessment("anonymous").data).toEqual(assessmentFixtures.anonymous);
    expect(canAdvance({}, "saturday-vector")).toBe(false);
    expect(canAdvance(answers, "saturday-vector")).toBe(true);
    expect(wizard).toContain('type="radio"');
    expect(wizard).toContain('PASO 03 / 12');
    expect(wizard).toContain("window.setTimeout");
  });

  it("covers missing, error and empty fixture states without requests", () => {
    const wizard = readFrontendFile(
      "src/features/assessment/components/AssessmentWizard.tsx",
    );
    const results = readFrontendFile(
      "src/features/assessment/components/AssessmentResults.tsx",
    );

    expect(getAssessment("missing").status).toBe("error");
    expect(getAssessment("error").status).toBe("error");
    expect(getAssessment("empty").status).toBe("empty");
    expect(`${wizard}\n${results}`).not.toMatch(
      /\b(fetch|axios|localStorage|sessionStorage)\b/,
    );
  });

  it("renders null values as unavailable in the results contract", () => {
    const results = readFrontendFile(
      "src/features/assessment/components/AssessmentResults.tsx",
    );

    expect(results).toContain("No disponible");
    expect(results).toContain("assessment.result.archetype");
    expect(results).toContain("routeCards");
  });
});
