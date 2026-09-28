import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCourseCard } from "@/lib/load-course-card";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/axios", () => ({ default: { get } }));

const course = {
  description: "Primeros pasos",
  instructor: "Teddy Paz",
  lessonCount: 120,
  videoHours: 11.5,
  previewYoutubeId: "h9qGQuJGhTo",
  coverImageUrl: "https://import.cdn.thinkific.com/643563/ozPWxfNjQBKugksdaogB_VSCODE.jpg",
  prerequisites: ["Saber usar una computadora"],
  tags: ["backend"],
  sections: [{ title: "Sección 1", lessons: ["Bienvenida"] }],
  url: "https://cursos.devtalles.com/courses/csharp",
  price: { amount: 40, currency: "USD" },
  related: [],
};

describe("loadCourseCard", () => {
  afterEach(() => {
    get.mockReset();
  });

  it("returns null when the request fails", async () => {
    get.mockRejectedValue(new Error("Network Error"));

    await expect(loadCourseCard("3306165")).resolves.toBeNull();
  });

  it("returns the course card with its cover", async () => {
    get.mockResolvedValue({ data: { course } });

    await expect(loadCourseCard("3306165")).resolves.toStrictEqual(course);
    expect(get).toHaveBeenCalledWith("/api/catalog/courses/3306165");
  });

  it("keeps a null cover as null", async () => {
    get.mockResolvedValue({ data: { course: { ...course, coverImageUrl: null } } });

    const card = await loadCourseCard("3306165");

    expect(card?.coverImageUrl).toBeNull();
  });
});
