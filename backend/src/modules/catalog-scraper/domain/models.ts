/** Canonical catalog models for the DevTalles scraper parsers. */

export type Money = {
  amount: number
  currency: 'USD'
}

export type Lesson = {
  index: number
  title: string
  isFreePreview: boolean
}

export type Section = {
  index: number
  title: string
  lessons: Lesson[]
}

/** Listing card DTO (PROMPT 2). `id` is null — enroll ID is not present on listing pages. */
export type CourseListingItem = {
  id: number | null
  slug: string
  url: string
  title: string
  shortDescription: string | null
  lessonsCount: number | null
  price: Money
  isNew: boolean
}

export type RelatedCourseRef = {
  id: number | null
  slug: string
  title: string
  url: string
}

export type Course = {
  id: number
  slug: string
  title: string
  subtitleLabel: string | null
  metaDescription: string | null
  description: string | null
  coverImageUrl: string | null
  previewYoutubeId: string | null
  price: Money
  lessonCount: number | null
  videoHours: number | null
  instructor: string | null
  hasSubtitles: boolean
  /** Bullet lines from "Requisitos previos" (PROMPT 2 list form). */
  prerequisites: string[]
  sections: Section[]
  relatedCourses: RelatedCourseRef[]
  /** Absolute path URL if a stable course→path link exists; else null. */
  learningPathUrl: string | null
  sourceUrl: string
}

export type PathBucket =
  | 'REQUIRED'
  | 'RECOMMENDED'
  | 'OPTIONAL'
  | 'ANYTIME'

export type PathEntry = {
  bucket: PathBucket
  courseSlug: string
  courseUrl: string
  label: string
  tags: string[]
  position: number
}

export type LearningPath = {
  id: string
  title: string
  pagePath: string
  entries: PathEntry[]
  /** All buckets, including empty ones when headers are present. */
  buckets: Record<PathBucket, PathEntry[]>
}
