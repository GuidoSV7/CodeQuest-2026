import { describe, expect, it } from "vitest";
import { modelFromUserPath } from "./model";

const path = {
  id: "ruta-c",
  title: "C#",
};

describe("modelFromUserPath", () => {
  it("starts at the first course and forks the rest when none is required", () => {
    const model = modelFromUserPath({
      ...path,
      items: [
        { courseId: "blazor", courseTitle: "Blazor", bucket: "recommended", position: 2 },
        { courseId: "dotnet", courseTitle: ".NET Backend", bucket: "recommended", position: 1 },
        { courseId: "csharp", courseTitle: "C#", bucket: "recommended", position: 0 },
      ],
    });

    expect(model.edges).toEqual([
      { fromCourseId: "csharp", toCourseId: "dotnet" },
      { fromCourseId: "csharp", toCourseId: "blazor" },
    ]);
  });

  it("keeps a required sequence as a chain and still links the other courses", () => {
    const model = modelFromUserPath({
      ...path,
      items: [
        { courseId: "micro", courseTitle: "Micro", bucket: "required", position: 2 },
        { courseId: "nest", courseTitle: "Nest", bucket: "required", position: 0 },
        { courseId: "extra", courseTitle: "Extra", bucket: "recommended", position: 3 },
        { courseId: "graphql", courseTitle: "GraphQL", bucket: "required", position: 1 },
        { courseId: "git", courseTitle: "Git", bucket: "anytime", position: 4 },
      ],
    });

    expect(model.edges).toEqual([
      { fromCourseId: "nest", toCourseId: "graphql" },
      { fromCourseId: "graphql", toCourseId: "micro" },
      { fromCourseId: "micro", toCourseId: "extra" },
      { fromCourseId: "micro", toCourseId: "git" },
    ]);
  });

  it("keeps the catalog card with topics, tags and the intro video", () => {
    const model = modelFromUserPath({
      ...path,
      items: [
        {
          courseId: "csharp",
          courseTitle: "C#",
          bucket: "recommended",
          position: 0,
          detail: {
            description: "Primeros pasos",
            instructor: "Fernando Herrera",
            lessonCount: 40,
            videoHours: 12,
            previewYoutubeId: "abc123XYZ",
            prerequisites: [],
            tags: ["bases"],
            sections: [{ title: "Fundamentos", lessons: ["Variables"] }],
            url: "https://cursos.devtalles.com/courses/csharp",
          },
        },
      ],
    });

    expect(model.items[0]).toMatchObject({
      lessonCount: 40,
      videoHours: 12,
      url: "https://cursos.devtalles.com/courses/csharp",
      detail: {
        tags: ["bases"],
        previewYoutubeId: "abc123XYZ",
        sections: [{ title: "Fundamentos", lessons: ["Variables"] }],
      },
    });
  });

  it("keeps edges that already came with the path", () => {
    const model = modelFromUserPath({
      ...path,
      edges: [{ from_course_id: "blazor", to_course_id: "dotnet" }],
      items: [
        { courseId: "csharp", courseTitle: "C#", bucket: "recommended", position: 0 },
        { courseId: "dotnet", courseTitle: ".NET Backend", bucket: "recommended", position: 1 },
      ],
    });

    expect(model.edges).toEqual([{ fromCourseId: "blazor", toCourseId: "dotnet" }]);
  });
});
