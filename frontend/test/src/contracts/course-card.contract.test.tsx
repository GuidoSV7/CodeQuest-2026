// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PathDiagram, type CourseCard, type DiagramModel } from "path-diagram";
import { afterEach, describe, expect, it } from "vitest";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

afterEach(() => {
  document.body.replaceChildren();
});

const example: unknown = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../../../contracts/course-card.example.json"), "utf8"),
);

const COURSE_CARD_KEYS = {
  description: true,
  instructor: true,
  lessonCount: true,
  videoHours: true,
  previewYoutubeId: true,
  coverImageUrl: true,
  prerequisites: true,
  tags: true,
  sections: true,
  url: true,
  price: true,
  related: true,
} satisfies Record<keyof CourseCard, true>;

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSection(value: unknown): value is CourseCard["sections"][number] {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    typeof value.title === "string" &&
    "lessons" in value &&
    isStringArray(value.lessons)
  );
}

function isPrice(value: unknown): value is NonNullable<CourseCard["price"]> {
  return (
    typeof value === "object" &&
    value !== null &&
    "amount" in value &&
    typeof value.amount === "number" &&
    "currency" in value &&
    value.currency === "USD"
  );
}

function isRelated(value: unknown): value is NonNullable<CourseCard["related"]>[number] {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    typeof value.title === "string" &&
    "url" in value &&
    typeof value.url === "string"
  );
}

function isCourseCard(value: unknown): value is CourseCard {
  return (
    typeof value === "object" &&
    value !== null &&
    "description" in value &&
    isStringOrNull(value.description) &&
    "instructor" in value &&
    isStringOrNull(value.instructor) &&
    "lessonCount" in value &&
    isNumberOrNull(value.lessonCount) &&
    "videoHours" in value &&
    isNumberOrNull(value.videoHours) &&
    "previewYoutubeId" in value &&
    isStringOrNull(value.previewYoutubeId) &&
    "coverImageUrl" in value &&
    isStringOrNull(value.coverImageUrl) &&
    "prerequisites" in value &&
    isStringArray(value.prerequisites) &&
    "tags" in value &&
    isStringArray(value.tags) &&
    "sections" in value &&
    Array.isArray(value.sections) &&
    value.sections.every(isSection) &&
    "url" in value &&
    typeof value.url === "string" &&
    "price" in value &&
    (value.price === null || isPrice(value.price)) &&
    "related" in value &&
    Array.isArray(value.related) &&
    value.related.every(isRelated)
  );
}

describe("CourseCard contract (consumer side)", () => {
  it("the shared example carries exactly the keys of the front CourseCard", () => {
    expect(typeof example === "object" && example !== null).toBe(true);
    expect(Object.keys(example ?? {}).sort()).toEqual(Object.keys(COURSE_CARD_KEYS).sort());
  });

  it("the shared example satisfies the front CourseCard shape", () => {
    expect(isCourseCard(example)).toBe(true);
  });

  it("renders the example cover in the course modal", () => {
    if (!isCourseCard(example)) throw new Error("contracts/course-card.example.json is not a CourseCard");
    const model: DiagramModel = {
      title: "C#",
      pathId: "path-1",
      allowProgress: false,
      edges: [],
      items: [
        {
          courseId: "csharp",
          title: "C#: Empieza tu camino en el lenguaje",
          url: example.url,
          bucket: "recommended",
          position: 0,
          alreadyKnown: false,
          partial: false,
          completed: false,
          category: null,
          lessonCount: example.lessonCount,
          videoHours: example.videoHours,
          detail: example,
        },
      ],
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(<PathDiagram model={model} mode="web" width={429} />);
    });
    const card = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("C#:"),
    );
    act(() => {
      card?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const cover = container.querySelector("[role='dialog'] img");
    expect(cover?.getAttribute("src")).toBe(example.coverImageUrl);
    act(() => root.unmount());
  });
});
