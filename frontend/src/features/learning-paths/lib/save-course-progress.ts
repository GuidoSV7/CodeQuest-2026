import api from "@/lib/axios";

export async function saveCourseProgress(
  courseId: string,
  status: "completed" | "not_started",
): Promise<void> {
  await api.put(`/api/me/courses/${encodeURIComponent(courseId)}/progress`, { status });
}
