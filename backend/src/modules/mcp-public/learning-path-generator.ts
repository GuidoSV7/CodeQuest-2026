import type { CatalogCourse, CatalogLearningPath, CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import type { PathBucket } from '../catalog-scraper/domain/models'
import { matchOfficialPath, normalizeText } from './resolve-alias'
import { renderMermaid } from './mermaid'

export type McpBucket = 'required' | 'recommended' | 'optional' | 'anytime'

export type GeneratedPath = {
  strategy: 'official_path' | 'catalog_search'
  source_path_id: string | null
  items: Array<{
    course_id: string
    title: string
    url: string
    bucket: McpBucket | null
    position: number
    already_known: boolean
  }>
  edges: Array<{ from_course_id: string; to_course_id: string }>
  edges_meta: { kind: 'linear_required' | 'linear_ranked'; inferred: true }
  diagram: { mermaid: string }
  catalog_version: number
  notes: string
}

export type GenerateInput = {
  goal: string
  knownCourseIds: string[]
  includeOptional: boolean
  fromSeed?: boolean
}

export type LearningPathGenerator = {
  generate(snapshot: CatalogSnapshot, input: GenerateInput): GeneratedPath
}

const INCLUDED = new Set<PathBucket>(['REQUIRED', 'RECOMMENDED'])
const OPTIONAL = new Set<PathBucket>(['OPTIONAL', 'ANYTIME'])

const BUCKET_OUT: Record<PathBucket, McpBucket> = {
  REQUIRED: 'required',
  RECOMMENDED: 'recommended',
  OPTIONAL: 'optional',
  ANYTIME: 'anytime',
}

export function createLearningPathGenerator(): LearningPathGenerator {
  return {
    generate(snapshot, input) {
      const known = new Set(input.knownCourseIds.map(String))
      const available = new Set(snapshot.paths.map((path) => path.id))
      const match = matchOfficialPath(input.goal, available)
      if (match) {
        const path = snapshot.paths.find((item) => item.id === match.pathId)
        if (path) return fromOfficial(snapshot, path, input, match.alias, known)
      }
      return fromSearch(snapshot, input, known)
    },
  }
}

function fromOfficial(
  snapshot: CatalogSnapshot,
  path: CatalogLearningPath,
  input: GenerateInput,
  alias: string,
  known: Set<string>,
): GeneratedPath {
  const coursesById = new Map(snapshot.courses.map((course) => [course.id, course]))
  let omitted = 0
  const items = path.entries
    .filter((entry) => {
      if (!INCLUDED.has(entry.bucket) && !(input.includeOptional && OPTIONAL.has(entry.bucket))) {
        return false
      }
      if (entry.courseId == null || !coursesById.has(entry.courseId)) {
        omitted += 1
        return false
      }
      return true
    })
    .sort((a, b) => a.position - b.position)
    .map((entry) => {
      const courseId = String(entry.courseId)
      return {
        course_id: courseId,
        title: entry.label,
        url: entry.courseUrl,
        bucket: BUCKET_OUT[entry.bucket],
        position: entry.position,
        already_known: known.has(courseId),
      }
    })

  const requiredIds = items
    .filter((item) => item.bucket === 'required')
    .sort((a, b) => a.position - b.position)
    .map((item) => item.course_id)
  const edges = chain(requiredIds)
  const notes =
    `Ruta oficial ${path.title} (${path.id}) elegida porque "${alias}" aparece en la meta. ` +
    `Catálogo v${snapshot.version}. ${omitted} curso(s) de la página no están publicados y se omitieron. ` +
    'Las flechas siguen el orden de los cursos obligatorios en la página, no un grafo de prerequisitos.'

  return {
    strategy: 'official_path',
    source_path_id: path.id,
    items,
    edges,
    edges_meta: { kind: 'linear_required', inferred: true },
    diagram: { mermaid: renderMermaid(items, edges) },
    catalog_version: snapshot.version,
    notes: withSeedNote(notes, input.fromSeed),
  }
}

function fromSearch(
  snapshot: CatalogSnapshot,
  input: GenerateInput,
  known: Set<string>,
): GeneratedPath {
  const ranked = rankCourses(snapshot.courses, input.goal).slice(0, 10)
  const items = ranked.map((course, index) => ({
    course_id: String(course.id),
    title: course.title,
    url: course.sourceUrl,
    bucket: null,
    position: index,
    already_known: known.has(String(course.id)),
  }))
  const edges = chain(items.map((item) => item.course_id))
  const goal = normalizeForNotes(input.goal)
  const notes =
    `No hay alias de ruta oficial para "${goal}". ` +
    `Se listan los ${items.length} cursos del catálogo v${snapshot.version} con mayor puntaje textual. ` +
    'El orden es ese ranking, no una ruta oficial.'
  return {
    strategy: 'catalog_search',
    source_path_id: null,
    items,
    edges,
    edges_meta: { kind: 'linear_ranked', inferred: true },
    diagram: { mermaid: renderMermaid(items, edges) },
    catalog_version: snapshot.version,
    notes: withSeedNote(notes, input.fromSeed),
  }
}

export function rankCourses(courses: CatalogCourse[], goal: string): CatalogCourse[] {
  const normalizedGoal = normalizeText(goal)
  const tokens = normalizedGoal.split(' ').filter(Boolean)
  return courses
    .filter((course) => course.status === 'ok')
    .map((course) => ({ course, score: scoreCourse(course, normalizedGoal, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.course.id - b.course.id)
    .map((row) => row.course)
}

function scoreCourse(course: CatalogCourse, goal: string, tokens: string[]): number {
  const title = normalizeText(course.title)
  const slug = normalizeText(course.slug.replace(/-/g, ' '))
  const meta = normalizeText(course.metaDescription ?? '')
  const description = normalizeText(course.description ?? '')
  const titleWords = new Set(title.split(' ').filter(Boolean))
  const metaWords = new Set(meta.split(' ').filter(Boolean))
  const descriptionWords = new Set(description.split(' ').filter(Boolean))
  let score = 0
  for (const token of tokens) {
    if (titleWords.has(token)) score += 10
    if (slug.split(' ').includes(token)) score += 6
    if (metaWords.has(token)) score += 3
    else if (descriptionWords.has(token)) score += 1
  }
  if (goal && title.includes(goal)) score += 25
  return score
}

function chain(ids: string[]): Array<{ from_course_id: string; to_course_id: string }> {
  const edges = []
  for (let i = 0; i < ids.length - 1; i += 1) {
    const from = ids[i]
    const to = ids[i + 1]
    if (!from || !to) continue
    edges.push({ from_course_id: from, to_course_id: to })
  }
  return edges
}

function normalizeForNotes(goal: string): string {
  return normalizeText(goal)
}

function withSeedNote(notes: string, fromSeed: boolean | undefined): string {
  if (!fromSeed) return notes
  return `${notes} Catálogo desde seed local porque Redis no respondió.`
}
