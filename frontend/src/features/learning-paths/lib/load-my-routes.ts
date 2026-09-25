import api from "@/lib/axios";

export type MyRouteSummary = {
  id: string;
  title: string;
};

type LearningPathListResponse = {
  items: Array<{ id: string; title: string }>;
};

export async function loadMyRoutes(): Promise<MyRouteSummary[]> {
  const response = await api.get<LearningPathListResponse>("/api/me/learning-paths");
  return response.data.items.map((item) => ({ id: item.id, title: item.title }));
}
