import api from "@/lib/axios";
import type { DiagramBucket } from "path-diagram";

export type OfficialPathPreviewItem = {
  courseId: string;
  courseTitle: string;
  bucket: DiagramBucket;
  position: number;
};

export async function previewOfficialPath(catalogPathId: string): Promise<{
  catalogPathId: string;
  items: OfficialPathPreviewItem[];
}> {
  const response = await api.get<{ catalogPathId: string; items: OfficialPathPreviewItem[] }>(
    `/api/catalog/paths/${encodeURIComponent(catalogPathId)}`,
  );
  return response.data;
}
