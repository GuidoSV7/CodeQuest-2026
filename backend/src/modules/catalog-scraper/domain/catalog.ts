import type { Course, LearningPath, PathEntry } from './models'

export type CourseCategory =
  | 'all'
  | 'wip'
  | 'free'
  | 'mini'
  | 'exclusive'
  | 'legacy'

export type CatalogCourse = Course & {
  categories: CourseCategory[]
  scrapedAt: string
  relatedCourseIds: number[]
  /** Present when detail fetch/parse failed after retries but slug was discovered. */
  status: 'ok' | 'partial'
}

export type CatalogPathEntry = PathEntry & {
  courseId: number | null
}

export type CatalogLearningPath = Omit<LearningPath, 'entries' | 'buckets'> & {
  entries: CatalogPathEntry[]
  buckets: Record<
    import('./models').PathBucket,
    CatalogPathEntry[]
  >
  scrapedAt: string
}

export type CatalogSnapshot = {
  version: number
  generatedAt: string
  source: 'scraper' | 'seed'
  courses: CatalogCourse[]
  paths: CatalogLearningPath[]
  stats: {
    courseCount: number
    pathCount: number
    categoryCounts: Record<CourseCategory, number>
  }
}

export type CatalogDiff = {
  addedCourseIds: number[]
  removedCourseIds: number[]
  changedCourseIds: number[]
  addedPathIds: string[]
  removedPathIds: string[]
}

export type SyncSummary = {
  coursesFound: number
  courseParseErrors: number
  pathsFound: number
  warnings: string[]
  diff: CatalogDiff
  version: number
  persisted: boolean
}

export class CatalogValidationError extends Error {
  readonly code = 'CATALOG_VALIDATION_ERROR' as const

  constructor(
    message: string,
    readonly failures: string[],
  ) {
    super(message)
    this.name = 'CatalogValidationError'
  }
}

export class HttpRequestError extends Error {
  readonly code = 'HTTP_REQUEST_ERROR' as const

  constructor(
    message: string,
    readonly status?: number,
    readonly retryable: boolean = false,
  ) {
    super(message)
    this.name = 'HttpRequestError'
  }
}
