import {
  CatalogValidationError,
  type CatalogSnapshot,
} from '../domain/catalog'

export type ValidateCatalogOptions = {
  minCourses: number
  expectedPathCount: number
  maxFailRatio: number
}

export function validateCatalog(
  snapshot: CatalogSnapshot,
  options: ValidateCatalogOptions,
): void {
  const failures: string[] = []

  if (snapshot.courses.length === 0) {
    failures.push('V7: catalog is empty')
  }

  if (snapshot.courses.length < options.minCourses) {
    failures.push(
      `V1: courses.length ${snapshot.courses.length} < minCourses ${options.minCourses}`,
    )
  }

  if (snapshot.paths.length !== options.expectedPathCount) {
    failures.push(
      `V2: paths.length ${snapshot.paths.length} !== expected ${options.expectedPathCount}`,
    )
  }

  const ids = new Set<number>()
  const slugs = new Set<string>()

  for (const course of snapshot.courses) {
    if (!course.id || course.id <= 0 || Number.isNaN(course.id)) {
      failures.push(`V6: invalid course id for slug=${course.slug}`)
    }
    if (!course.slug || !course.title || !course.price || !course.sourceUrl) {
      failures.push(`V3: missing required fields for id=${course.id}`)
    }
    if (!course.categories || course.categories.length < 1) {
      failures.push(`V3: categories missing for id=${course.id}`)
    }
    if (ids.has(course.id)) {
      failures.push(`V4: duplicate course id ${course.id}`)
    }
    if (slugs.has(course.slug)) {
      failures.push(`V4: duplicate course slug ${course.slug}`)
    }
    ids.add(course.id)
    slugs.add(course.slug)
  }

  if (snapshot.stats.courseCount !== snapshot.courses.length) {
    failures.push(
      `V9: stats.courseCount ${snapshot.stats.courseCount} !== courses.length ${snapshot.courses.length}`,
    )
  }

  if (failures.length > 0) {
    throw new CatalogValidationError(
      `Catalog validation failed (${failures.length} checks)`,
      failures,
    )
  }
}
