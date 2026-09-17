import type { CatalogDiff, CatalogSnapshot } from '../domain/catalog'

export function diffCatalogs(
  previous: CatalogSnapshot | null,
  next: CatalogSnapshot,
): CatalogDiff {
  if (!previous) {
    return {
      addedCourseIds: next.courses.map((c) => c.id),
      removedCourseIds: [],
      changedCourseIds: [],
      addedPathIds: next.paths.map((p) => p.id),
      removedPathIds: [],
    }
  }

  const prevCourses = new Map(previous.courses.map((c) => [c.id, c]))
  const nextCourses = new Map(next.courses.map((c) => [c.id, c]))

  const addedCourseIds: number[] = []
  const removedCourseIds: number[] = []
  const changedCourseIds: number[] = []

  for (const [id, course] of nextCourses) {
    const prev = prevCourses.get(id)
    if (!prev) {
      addedCourseIds.push(id)
      continue
    }
    if (
      prev.slug !== course.slug ||
      prev.title !== course.title ||
      prev.price.amount !== course.price.amount ||
      prev.lessonCount !== course.lessonCount
    ) {
      changedCourseIds.push(id)
    }
  }
  for (const id of prevCourses.keys()) {
    if (!nextCourses.has(id)) removedCourseIds.push(id)
  }

  const prevPaths = new Set(previous.paths.map((p) => p.id))
  const nextPaths = new Set(next.paths.map((p) => p.id))

  return {
    addedCourseIds,
    removedCourseIds,
    changedCourseIds,
    addedPathIds: [...nextPaths].filter((id) => !prevPaths.has(id)),
    removedPathIds: [...prevPaths].filter((id) => !nextPaths.has(id)),
  }
}
