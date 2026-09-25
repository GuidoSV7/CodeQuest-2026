import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import { OFFICIAL_PATH_IDS, SITE_ORIGIN } from '../catalog-scraper/domain/config'
import type { LearningPathGenerator } from './learning-path-generator'
import { rankCourses } from './learning-path-generator'
import { renderMermaid } from './mermaid'

const BUCKET = {
  REQUIRED: 'required',
  RECOMMENDED: 'recommended',
  OPTIONAL: 'optional',
  ANYTIME: 'anytime',
} as const

export class McpToolError extends Error {
  constructor(message: 'not_found' | 'invalid_input' | 'catalog_unavailable') {
    super(message)
    this.name = 'McpToolError'
  }
}

export function searchCourses(
  snapshot: CatalogSnapshot,
  input: {
    query: string
    officialPathId?: string
    price?: 'free' | 'paid' | 'any'
    limit?: number
  },
) {
  const official = new Set<string>(OFFICIAL_PATH_IDS)
  if (input.officialPathId && !official.has(input.officialPathId)) {
    throw new McpToolError('invalid_input')
  }
  let pool = snapshot.courses.filter((course) => course.status === 'ok')
  const price = input.price ?? 'any'
  if (price === 'free') pool = pool.filter((course) => course.price.amount === 0)
  if (price === 'paid') pool = pool.filter((course) => course.price.amount > 0)
  if (input.officialPathId) {
    const path = snapshot.paths.find((item) => item.id === input.officialPathId)
    if (!path) throw new McpToolError('not_found')
    const ids = new Set(
      path.entries.flatMap((entry) => (entry.courseId == null ? [] : [entry.courseId])),
    )
    pool = pool.filter((course) => ids.has(course.id))
  }
  const limit = input.limit ?? 10
  const ranked = rankCourses(pool, input.query).slice(0, limit)
  return {
    catalog_version: snapshot.version,
    courses: ranked.map((course) => ({
      id: String(course.id),
      slug: course.slug,
      title: course.title,
      short_description: clip(course.metaDescription),
      price: course.price,
      lesson_count: course.lessonCount,
      video_hours: course.videoHours,
      instructor: course.instructor,
      url: course.sourceUrl,
      official_path_ids: officialPathIdsFor(snapshot, course.id),
    })),
  }
}

export function getCourse(snapshot: CatalogSnapshot, id: string) {
  const course = snapshot.courses.find((item) => String(item.id) === id && item.status === 'ok')
  if (!course) throw new McpToolError('not_found')
  const known = new Map(snapshot.courses.map((item) => [item.slug, String(item.id)]))
  return {
    catalog_version: snapshot.version,
    course: {
      id: String(course.id),
      slug: course.slug,
      title: course.title,
      description: course.description,
      prerequisites: course.prerequisites,
      preview_url: course.previewYoutubeId
        ? `https://www.youtube.com/watch?v=${course.previewYoutubeId}`
        : null,
      sections: course.sections.map((section) => ({
        index: section.index,
        title: section.title,
        lessons: section.lessons.map((lesson) => ({
          index: lesson.index,
          title: lesson.title,
          is_free_preview: lesson.isFreePreview,
        })),
      })),
      related_courses: course.relatedCourses.map((related) => ({
        id: known.get(related.slug) ?? null,
        slug: related.slug,
        title: related.title,
        url: related.url,
      })),
      price: course.price,
      lesson_count: course.lessonCount,
      video_hours: course.videoHours,
      instructor: course.instructor,
      url: course.sourceUrl,
    },
  }
}

export function listOfficialPaths(snapshot: CatalogSnapshot) {
  const byId = new Map(snapshot.paths.map((path) => [path.id, path]))
  const paths = []
  for (const id of OFFICIAL_PATH_IDS) {
    const path = byId.get(id)
    if (!path) continue
    paths.push({
      id: path.id,
      title: path.title,
      course_count: path.entries.filter((entry) => entry.courseId != null).length,
    })
  }
  return { catalog_version: snapshot.version, paths }
}

export function getOfficialPath(snapshot: CatalogSnapshot, id: string) {
  const path = snapshot.paths.find((item) => item.id === id)
  if (!path || !OFFICIAL_PATH_IDS.includes(id as (typeof OFFICIAL_PATH_IDS)[number])) {
    throw new McpToolError('not_found')
  }
  const published = new Map(
    snapshot.courses
      .filter((course) => course.status === 'ok' || course.status === 'partial')
      .map((course) => [course.id, course.status === 'partial'] as const),
  )
  const courses = path.entries
    .filter((entry) => entry.courseId != null && published.has(entry.courseId))
    .sort((a, b) => a.position - b.position)
    .map((entry) => ({
      course_id: String(entry.courseId),
      title: entry.label,
      url: entry.courseUrl,
      bucket: BUCKET[entry.bucket],
      position: entry.position,
      partial: published.get(entry.courseId!) === true,
    }))
  const requiredIds = courses.filter((item) => item.bucket === 'required').map((item) => item.course_id)
  const edges = []
  for (let i = 0; i < requiredIds.length - 1; i += 1) {
    const from = requiredIds[i]
    const to = requiredIds[i + 1]
    if (!from || !to) continue
    edges.push({ from_course_id: from, to_course_id: to })
  }
  const items = courses.map((course) => ({ ...course, already_known: false }))
  return {
    catalog_version: snapshot.version,
    path: {
      id: path.id,
      title: path.title,
      url: `${SITE_ORIGIN}${path.pagePath}`,
      courses,
      edges,
      edges_meta: { kind: 'linear_required' as const, inferred: true as const },
      diagram: { mermaid: renderMermaid(items, edges) },
    },
  }
}

export function generatePath(
  snapshot: CatalogSnapshot,
  generator: LearningPathGenerator,
  input: { goal: string; knownCourseIds: string[]; includeOptional: boolean; fromSeed: boolean },
) {
  const published = new Set(snapshot.courses.map((course) => String(course.id)))
  const knownCourseIds = input.knownCourseIds.filter((id) => published.has(id))
  return generator.generate(snapshot, { ...input, knownCourseIds })
}

function officialPathIdsFor(snapshot: CatalogSnapshot, courseId: number): string[] {
  return OFFICIAL_PATH_IDS.filter((id) => {
    const path = snapshot.paths.find((item) => item.id === id)
    return path?.entries.some((entry) => entry.courseId === courseId) ?? false
  })
}

function clip(value: string | null): string | null {
  if (value == null) return null
  return value.length <= 280 ? value : value.slice(0, 280)
}
