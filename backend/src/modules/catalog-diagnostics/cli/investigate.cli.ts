import * as cheerio from 'cheerio'
import { writeFileSync } from 'node:fs'
import {
  DEFAULT_USER_AGENT,
  LISTING_PAGES,
  OFFICIAL_PATH_IDS,
  SITE_ORIGIN,
} from '../../catalog-scraper/domain/config'
import { parseCourseListing } from '../../catalog-scraper/infrastructure/parsers/parse-course-listing'
import { parseLearningPath } from '../../catalog-scraper/infrastructure/parsers/parse-learning-path'
import { extractSlugFromHref } from '../../catalog-scraper/infrastructure/parsers/html-utils'

async function get(path: string) {
  const res = await fetch(SITE_ORIGIN + path, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
    signal: AbortSignal.timeout(45_000),
  })
  const html = await res.text()
  await new Promise((r) => setTimeout(r, 1100))
  return { status: res.status, html }
}

function extractSlugsResilient(html: string): string[] {
  const $ = cheerio.load(html)
  const slugs: string[] = []
  $('a.card.card--curso').each((_, el) => {
    const href = $(el).attr('href')
    if (!href?.includes('/courses/')) return
    try {
      slugs.push(extractSlugFromHref(href))
    } catch {
      /* ignore */
    }
  })
  return slugs
}

async function main() {
  const byCategory: Record<string, string[]> = {}
  const parseErrors: Array<{ category: string; error: string; badSlugs: string[] }> =
    []

  for (const page of LISTING_PAGES) {
    const { html } = await get(page.path)
    const resilient = extractSlugsResilient(html)
    byCategory[page.category] = resilient
    try {
      parseCourseListing(html)
    } catch (e) {
      const bad: string[] = []
      const $ = cheerio.load(html)
      $('a.card.card--curso').each((_, el) => {
        const $c = $(el)
        const href = $c.attr('href') ?? ''
        const hasFree = $c.find('.card__badge--free').length > 0
        const strong = $c.find('p.card__price strong').text().trim()
        const priceText = $c.find('p.card__price').text().trim()
        if (!hasFree && !strong && !/\$/.test(priceText)) {
          bad.push(href)
        }
      })
      parseErrors.push({
        category: page.category,
        error: e instanceof Error ? e.message : String(e),
        badSlugs: bad,
      })
    }
  }

  const union = new Set<string>()
  for (const slugs of Object.values(byCategory)) {
    for (const s of slugs) union.add(s)
  }

  const pathReports: Array<{
    id: string
    entryCount: number
    buckets: Record<string, number>
    hasAnytimeHeader: boolean
    encabezados: string[]
    slugs: string[]
    parseError?: string
  }> = []

  for (const id of OFFICIAL_PATH_IDS) {
    const { html } = await get(`/pages/${id}`)
    const hasAnytimeHeader = /EN CUALQUIER MOMENTO/i.test(html)
    const $ = cheerio.load(html)
    const encabezados = $('div.encabezado')
      .toArray()
      .map((el) => $(el).text().replace(/\s+/g, ' ').trim())
    try {
      const path = parseLearningPath(html, id)
      pathReports.push({
        id,
        entryCount: path.entries.length,
        buckets: {
          REQUIRED: path.buckets.REQUIRED.length,
          RECOMMENDED: path.buckets.RECOMMENDED.length,
          OPTIONAL: path.buckets.OPTIONAL.length,
          ANYTIME: path.buckets.ANYTIME.length,
        },
        hasAnytimeHeader,
        encabezados,
        slugs: path.entries.map((e) => e.courseSlug),
      })
    } catch (e) {
      pathReports.push({
        id,
        entryCount: 0,
        buckets: {},
        hasAnytimeHeader,
        encabezados,
        slugs: [],
        parseError: e instanceof Error ? e.message : String(e),
      })
    }
  }

  const pathSlugs = new Set(pathReports.flatMap((p) => p.slugs))
  const unresolvedVsListings = [...pathSlugs].filter((s) => !union.has(s))

  const report = {
    listingCounts: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, v.length]),
    ),
    uniqueCourseSlugs: union.size,
    parseErrors,
    pathCount: pathReports.filter((p) => !p.parseError).length,
    pathReports,
    pathSlugsNotInAnyListing: unresolvedVsListings,
    expected: { coursesApprox: 75, paths: 13 },
  }

  writeFileSync('/tmp/devtalles-prompt7-invest.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
