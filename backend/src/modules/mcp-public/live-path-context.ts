import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import { OFFICIAL_PATH_IDS } from '../catalog-scraper/domain/config'

const OFFICIAL = new Set<string>(OFFICIAL_PATH_IDS)

export function livePathAnnotation(
  snapshot: CatalogSnapshot,
  input: { sourcePathId: string | null; courseIds: string[] },
): {
  instructors: Record<string, string | null>
  related_paths: Array<{ path_id: string; title: string }>
} {
  const instructors: Record<string, string | null> = {}
  for (const courseId of input.courseIds) {
    const course = snapshot.courses.find((item) => String(item.id) === courseId)
    instructors[courseId] = course?.instructor ?? null
  }

  const source = snapshot.paths.find((path) => path.id === input.sourcePathId)
  const selected = new Set(input.courseIds.map((id) => Number(id)))
  const sourceTags = new Set<string>()
  const tagged = source ? [source] : snapshot.paths
  for (const path of tagged) {
    for (const entry of path.entries) {
      if (!source && entry.courseId != null && !selected.has(entry.courseId)) continue
      for (const tag of entry.tags) sourceTags.add(tag)
    }
  }

  const ranked = snapshot.paths
    .filter((path) => OFFICIAL.has(path.id) && path.id !== input.sourcePathId)
    .map((path) => ({
      path,
      score: path.entries.reduce(
        (total, entry) => total + entry.tags.filter((tag) => sourceTags.has(tag)).length,
        0,
      ),
    }))
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score || left.path.title.localeCompare(right.path.title))
    .slice(0, 3)
    .map((row) => ({ path_id: row.path.id, title: row.path.title }))

  return { instructors, related_paths: ranked }
}
