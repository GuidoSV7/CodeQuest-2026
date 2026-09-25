import type {
  AssessmentFixture,
  AssessmentQuestion,
} from "@/features/orbital/fixtures";

export type AssessmentAnswers = Readonly<Record<string, string>>;

export type AssessmentDataResult =
  | { status: "ready"; data: AssessmentFixture }
  | {
      status: "loading" | "empty" | "error" | "disabled";
      data: null;
      errorCode?: "fixture_error" | "fixture_unavailable";
    };

export type { AssessmentFixture, AssessmentQuestion };
