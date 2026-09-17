import type { Cheerio, CheerioAPI, Element } from 'cheerio'
import { CatalogParseError } from '../../domain/errors'
import type { LearningPath, PathBucket, PathEntry } from '../../domain/models'
import {
  absoluteCourseUrl,
  extractSlugFromHref,
  loadHtml,
  textOf,
} from './html-utils'

const EMPTY_BUCKETS = (): Record<PathBucket, PathEntry[]> => ({
  REQUIRED: [],
  RECOMMENDED: [],
  OPTIONAL: [],
  ANYTIME: [],
})

/**
 * Parses a DevTalles official learning-path page.
 * Pure function — no I/O.
 */
export function parseLearningPath(html: string, pathId: string): LearningPath {
  const $ = loadHtml(html)
  const $wrappers = $('div.RutaWrapper')

  if ($wrappers.length === 0) {
    throw new CatalogParseError(
      'parseLearningPath: missing .RutaWrapper (unexpected HTML structure)',
      { pathId },
    )
  }

  const title =
    textOf($('div.titulo').first()) ||
    textOf($('title').first()).replace(/\s*\|.*$/, '') ||
    pathId

  const buckets = EMPTY_BUCKETS()
  const entries: PathEntry[] = []
  let position = 0
  let inAnytime = false

  // Scope includes siblings after RutaWrapper (EN CUALQUIER MOMENTO + links may sit outside the grid wrapper).
  const $scope = $wrappers.first().parent()

  $scope.find('div.encabezado, a[href*="/courses/"]').each((_, el) => {
    const $el = $(el)
    if (el.tagName === 'div') {
      const label = textOf($el).toUpperCase()
      if (label.includes('CUALQUIER MOMENTO')) {
        inAnytime = true
      }
      return
    }

    if (!$el.find('div.main-box').length) return

    const entry = parsePathAnchor($, $el, inAnytime, position)
    if (!entry) return

    // Deduplicate by slug+bucket if the same anchor is matched twice
    if (
      entries.some(
        (e) => e.courseSlug === entry.courseSlug && e.bucket === entry.bucket,
      )
    ) {
      return
    }

    entries.push(entry)
    buckets[entry.bucket].push(entry)
    position += 1
  })

  if (entries.length === 0) {
    throw new CatalogParseError(
      'parseLearningPath: RutaWrapper found but no course entries',
      { pathId },
    )
  }

  return {
    id: pathId,
    title,
    pagePath: `/pages/${pathId}`,
    entries,
    buckets,
  }
}

function parsePathAnchor(
  $: CheerioAPI,
  $a: Cheerio<Element>,
  inAnytime: boolean,
  position: number,
): PathEntry | null {
  const href = $a.attr('href')
  if (!href || !href.includes('/courses/')) return null

  const $box = $a.find('div.main-box').first()
  const boxId = $box.attr('id') ?? ''
  const label = textOf($a.find('p.main-text').first()) || textOf($a)
  if (!label) return null

  const bucket = inAnytime ? 'ANYTIME' : bucketFromBoxId(boxId)
  const tags = extractTags($, $box)

  return {
    bucket,
    courseSlug: extractSlugFromHref(href),
    courseUrl: absoluteCourseUrl(href),
    label,
    tags,
    position,
  }
}

function bucketFromBoxId(boxId: string): PathBucket {
  const prefix = boxId.replace(/\d+$/, '').toLowerCase()
  if (prefix === 'le') return 'REQUIRED'
  if (prefix === 'mi') return 'RECOMMENDED'
  if (prefix === 'ri') return 'OPTIONAL'
  return 'RECOMMENDED'
}

function extractTags($: CheerioAPI, $box: Cheerio<Element>): string[] {
  const tags: string[] = []
  $box.find('span[class*="-text"]').each((_, el) => {
    const cls = ($(el).attr('class') ?? '').split(/\s+/)
    if (cls.some((c) => c === 'main-text')) return
    const isTag = cls.some((c) =>
      /^(bases|frontend|backend|movil|mobile)-text$/.test(c),
    )
    if (!isTag) return
    const t = textOf($(el))
    if (t) tags.push(t.toLowerCase())
  })
  return tags
}
