import type { CatalogSnapshot } from '../domain/catalog'
import { OFFICIAL_PATH_IDS } from '../domain/config'

const BUCKET = {
  REQUIRED: 'required',
  RECOMMENDED: 'recommended',
  OPTIONAL: 'optional',
  ANYTIME: 'anytime',
} as const

export type OfficialPathPreviewItem = {
  courseId: string
  courseTitle: string
  bucket: (typeof BUCKET)[keyof typeof BUCKET]
  position: number
}

export type OfficialPathPreview = {
  catalogPathId: string
  items: OfficialPathPreviewItem[]
}

/** Published courses of an official catalog path. Does not create a user route. */
export function officialPathPreview(
  snapshot: CatalogSnapshot,
  pathId: string,
): OfficialPathPreview | null {
  if (!OFFICIAL_PATH_IDS.includes(pathId as (typeof OFFICIAL_PATH_IDS)[number])) {
    return null
  }
  const path = snapshot.paths.find((item) => item.id === pathId)
  if (!path) return null
  const published = new Set(
    snapshot.courses
      .filter((course) => course.status === 'ok' || course.status === 'partial')
      .map((course) => course.id),
  )
  const seen = new Set<number>()
  const items = path.entries
    .filter((entry) => entry.courseId != null && published.has(entry.courseId))
    .sort((left, right) => left.position - right.position)
    .flatMap((entry) => {
      if (entry.courseId == null || seen.has(entry.courseId)) return []
      seen.add(entry.courseId)
      return [{
        courseId: String(entry.courseId),
        courseTitle: entry.label,
        bucket: BUCKET[entry.bucket],
        position: entry.position,
      }]
    })
  return { catalogPathId: path.id, items }
}
