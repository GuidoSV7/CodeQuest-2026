import api from "@/lib/axios";

export type MyRouteSummary = {
  id: string;
  title: string;
  itemCount: number;
  completedCount: number;
  progressRatio: number;
  sourceCatalogPathId: string | null;
};

type LearningPathSummaryItem = {
  id: string;
  title: string;
  itemCount?: number;
  completedCount?: number;
  progressRatio?: number;
  sourceCatalogPathId?: string | null;
};

type LearningPathListResponse = {
  items: LearningPathSummaryItem[];
};

export async function createOfficialRoute(input: {
  catalogPathId: string;
  title: string;
}): Promise<MyRouteSummary> {
  const response = await api.post<LearningPathSummaryItem>("/api/me/learning-paths", {
    kind: "official",
    catalogPathId: input.catalogPathId,
    title: input.title,
  });
  return {
    id: response.data.id,
    title: response.data.title,
    itemCount: response.data.itemCount ?? 0,
    completedCount: response.data.completedCount ?? 0,
    progressRatio: response.data.progressRatio ?? 0,
    sourceCatalogPathId: response.data.sourceCatalogPathId ?? null,
  };
}

export async function loadMyRoutes(): Promise<MyRouteSummary[]> {
  const response = await api.get<LearningPathListResponse>("/api/me/learning-paths");
  return response.data.items.map((item) => ({
    id: item.id,
    title: item.title,
    itemCount: item.itemCount ?? 0,
    completedCount: item.completedCount ?? 0,
    progressRatio: item.progressRatio ?? 0,
    sourceCatalogPathId: item.sourceCatalogPathId ?? null,
  }));
}
