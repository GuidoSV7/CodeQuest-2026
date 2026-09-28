import { describe, expect, it } from "vitest";
import { suggestOfficialPath } from "@/features/learning-paths/lib/route-questionnaire";

describe("suggestOfficialPath", () => {
  it("sends a beginner who wants a website to the fundamentals path", () => {
    expect(suggestOfficialPath("web", "starting")).toBe("programas-fundamentos");
  });

  it("sends someone who already ships APIs to NestJS", () => {
    expect(suggestOfficialPath("api", "building")).toBe("programas-nest");
  });

  it("keeps mobile on Dart even when they are just starting", () => {
    expect(suggestOfficialPath("mobile", "starting")).toBe("ruta-dart");
  });
});
