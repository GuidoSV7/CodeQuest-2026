import type { CatalogSnapshot } from '../domain/catalog'

export type CourseCard = {
  description: string | null
  instructor: string | null
  lessonCount: number | null
  videoHours: number | null
  previewYoutubeId: string | null
  coverImageUrl: string | null
  prerequisites: string[]
  tags: string[]
  sections: Array<{ title: string; lessons: string[] }>
  url: string
  price: { amount: number; currency: 'USD' } | null
  related: Array<{ title: string; url: string }>
}

const COVER_IMAGE_HOST = 'import.cdn.thinkific.com'

/** Trust boundary for scraped covers: the front renders the URL as-is. */
export function allowedCoverImageUrl(raw: string | null): string | null {
  if (!raw || !URL.canParse(raw)) return null
  const url = new URL(raw)
  if (url.protocol !== 'https:') return null
  if (url.hostname !== COVER_IMAGE_HOST) return null
  if (url.username || url.password || url.port) return null
  return raw
}

export function toCourseCard(snapshot: CatalogSnapshot, courseId: string): CourseCard | null {
  const course = snapshot.courses.find((item) => String(item.id) === courseId)
  if (!course) return null
  const numericId = Number(courseId)
  const tags = new Set<string>()
  for (const path of snapshot.paths) {
    for (const entry of path.entries) {
      if (entry.courseId !== numericId) continue
      for (const tag of entry.tags) tags.add(tag)
    }
  }
  return {
    description: course.description,
    instructor: course.instructor,
    lessonCount: course.lessonCount,
    videoHours: course.videoHours,
    previewYoutubeId: course.previewYoutubeId,
    coverImageUrl: allowedCoverImageUrl(course.coverImageUrl),
    prerequisites: course.prerequisites,
    tags: [...tags].sort((left, right) => left.localeCompare(right)),
    sections: course.sections.map((section) => ({
      title: section.title,
      lessons: section.lessons.map((lesson) => lesson.title),
    })),
    url: course.sourceUrl,
    price: course.price,
    related: course.relatedCourses.map((related) => ({
      title: related.title,
      url: related.url,
    })),
  }
}
