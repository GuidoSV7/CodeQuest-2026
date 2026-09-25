import api from "@/lib/axios";
import type { DiagramBucket } from "path-diagram";

export type PathDetailResponse = {
  id: string;
  title: string;
  items: Array<{
    courseId: string;
    courseTitle: string;
    bucket: DiagramBucket | null;
    position: number;
    progress?: { status?: string };
  }>;
};

export async function loadPathDetail(routeId: string): Promise<PathDetailResponse | null> {
  const response = await api.get<PathDetailResponse>(`/api/me/learning-paths/${routeId}`);
  return response.data;
}
