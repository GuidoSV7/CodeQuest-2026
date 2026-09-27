import type { CourseCard } from "path-diagram";
import api from "@/lib/axios";

export async function loadCourseCard(courseId: string): Promise<CourseCard | null> {
  try {
    const response = await api.get<{ course: CourseCard }>(`/api/catalog/courses/${courseId}`);
    return response.data.course ?? null;
  } catch {
    return null;
  }
}
