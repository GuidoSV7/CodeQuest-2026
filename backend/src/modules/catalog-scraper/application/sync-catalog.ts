import {
  CatalogValidationError,
  type CatalogCourse,
  type CatalogLearningPath,
  type CatalogPathEntry,
  type CatalogSnapshot,
  type CourseCategory,
  type SyncSummary,
} from '../domain/catalog'
import type { ScraperConfig } from '../domain/config'
import type { CatalogRepository } from '../ports/catalog-repository.port'
import type { HttpClient } from '../ports/http-client.port'
import { parseCourseListing } from '../infrastructure/parsers/parse-course-listing'
import { parseCoursePage } from '../infrastructure/parsers/parse-course-page'
import { parseLearningPath } from '../infrastructure/parsers/parse-learning-path'
import type { PathBucket } from '../domain/models'
import { diffCatalogs } from './catalog-diff'
import { validateCatalog } from './validate-catalog'

export type SyncCatalogDeps = {
  http: HttpClient
  catalogRepository: CatalogRepository
  config: ScraperConfig
  now?: () => Date
}

export async function syncCatalog(deps: SyncCatalogDeps): Promise<SyncSummary> {
  const now = deps.now ?? (() => new Date())
  const scrapedAt = now().toISOString()
  const warnings: string[] = []
  const { config, http } = deps

  // --- 1) Discover from listings ---
  const slugCategories = new Map<string, Set<CourseCategory>>()

  for (const listing of config.listingPages) {
    const url = `${config.baseUrl}${listing.path}`
    const html = await http.getText(url)
    const items = parseCourseListing(html)
    for (const item of items) {
      const set = slugCategories.get(item.slug) ?? new Set<CourseCategory>()
      set.add(listing.category)
      slugCategories.set(item.slug, set)
    }
  }

  const slugs = [...slugCategories.keys()]

  // --- 2) Fetch course details ---
  let courseParseErrors = 0
  const coursesById = new Map<number, CatalogCourse>()

  await mapPool(slugs, config.maxConcurrency, async (slug) => {
    const categories = [...(slugCategories.get(slug) ?? [])]
    const url = `${config.baseUrl}/courses/${slug}`
    try {
      const html = await http.getText(url)
      const parsed = parseCoursePage(html, slug)
      const existing = coursesById.get(parsed.id)
      if (existing) {
        existing.categories = uniqueCategories([
          ...existing.categories,
          ...categories,
        ])
        return
      }
      coursesById.set(parsed.id, {
        ...parsed,
        slug, // preserve discovery slug (canonical secondary)
        categories: uniqueCategories(categories),
        scrapedAt,
        relatedCourseIds: [],
        status: 'ok',
      })
    } catch (err) {
      courseParseErrors += 1
      warnings.push(
        `course detail failed for ${slug}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })

  const attempted = slugs.length
  const failRatio = attempted === 0 ? 1 : courseParseErrors / attempted
  if (failRatio > config.maxFailRatio) {
    throw new CatalogValidationError(
      `V8: course fail ratio ${failRatio.toFixed(3)} > max ${config.maxFailRatio}`,
      [
        `V8: ${courseParseErrors}/${attempted} course details failed (ratio ${failRatio})`,
      ],
    )
  }

  // Resolve relatedCourseIds
  const slugToId = new Map(
    [...coursesById.values()].map((c) => [c.slug, c.id] as const),
  )
  for (const course of coursesById.values()) {
    course.relatedCourseIds = course.relatedCourses
      .map((r) => slugToId.get(r.slug))
      .filter((id): id is number => typeof id === 'number')
  }

  // --- 3) Paths ---
  const paths: CatalogLearningPath[] = []
  await mapPool([...config.pathIds], config.maxConcurrency, async (pathId) => {
    const url = `${config.baseUrl}/pages/${pathId}`
    const html = await http.getText(url)
    const parsed = parseLearningPath(html, pathId)
    const entries: CatalogPathEntry[] = parsed.entries.map((e) => {
      const courseId = slugToId.get(e.courseSlug) ?? null
      if (courseId === null) {
        warnings.push(
          `path entry unresolved: path=${pathId} slug=${e.courseSlug}`,
        )
      }
      return { ...e, courseId }
    })

    const emptyBuckets = (): Record<PathBucket, CatalogPathEntry[]> => ({
      REQUIRED: [],
      RECOMMENDED: [],
      OPTIONAL: [],
      ANYTIME: [],
    })
    const buckets = emptyBuckets()
    for (const entry of entries) {
      buckets[entry.bucket].push(entry)
    }

    paths.push({
      id: parsed.id,
      title: parsed.title,
      pagePath: parsed.pagePath,
      entries,
      buckets,
      scrapedAt,
    })
  })

  const courses = [...coursesById.values()].sort((a, b) => a.id - b.id)
  const categoryCounts = emptyCategoryCounts()
  for (const course of courses) {
    for (const cat of course.categories) {
      categoryCounts[cat] += 1
    }
  }

  const snapshot: CatalogSnapshot = {
    version: 0,
    generatedAt: scrapedAt,
    source: 'scraper',
    courses,
    paths,
    stats: {
      courseCount: courses.length,
      pathCount: paths.length,
      categoryCounts,
    },
  }

  validateCatalog(snapshot, {
    minCourses: config.minCourses,
    expectedPathCount: config.pathIds.length,
    maxFailRatio: config.maxFailRatio,
  })

  const previous = await deps.catalogRepository.getCurrent()
  const diff = diffCatalogs(previous, snapshot)
  const saved = await deps.catalogRepository.save(snapshot)

  return {
    coursesFound: courses.length,
    courseParseErrors,
    pathsFound: paths.length,
    warnings,
    diff,
    version: saved.version,
    persisted: true,
  }
}

function uniqueCategories(categories: CourseCategory[]): CourseCategory[] {
  return [...new Set(categories)]
}

function emptyCategoryCounts(): Record<CourseCategory, number> {
  return {
    all: 0,
    wip: 0,
    free: 0,
    mini: 0,
    exclusive: 0,
    legacy: 0,
  }
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0
  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    async () => {
      while (index < items.length) {
        const current = items[index]
        index += 1
        if (current !== undefined) await worker(current)
      }
    },
  )
  if (items.length === 0) return
  await Promise.all(runners)
}
