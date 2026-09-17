import * as cheerio from 'cheerio'
import {
  DEFAULT_USER_AGENT,
  LISTING_PAGES,
  SITE_ORIGIN,
} from '../../catalog-scraper/domain/config'
import { parseCourseListing } from '../../catalog-scraper/infrastructure/parsers/parse-course-listing'

async function get(path: string) {
  const res = await fetch(SITE_ORIGIN + path, {
    headers: { 'User-Agent': DEFAULT_USER_AGENT, Accept: 'text/html' },
    signal: AbortSignal.timeout(45_000),
  })
  return { status: res.status, html: await res.text() }
}

async function main() {
  for (const page of LISTING_PAGES) {
    const { status, html } = await get(page.path)
    console.log('\n===', page.category, page.path, 'HTTP', status, 'bytes', html.length)
    try {
      const items = parseCourseListing(html)
      console.log('  parsed OK', items.length)
    } catch (e) {
      console.log('  PARSE FAIL', e instanceof Error ? e.message : e)
      const $ = cheerio.load(html)
      $('a.card.card--curso').each((_, el) => {
        const $c = $(el)
        const slug = $c.attr('href')
        const priceText = $c.find('p.card__price').text().replace(/\s+/g, ' ').trim()
        const hasFree = $c.find('.card__badge--free').length > 0
        const strong = $c.find('p.card__price strong').text().trim()
        if (!hasFree && !/\$/.test(priceText) && !strong) {
          console.log('  BAD CARD', slug, {
            priceText: JSON.stringify(priceText),
            hasFree,
            strong: JSON.stringify(strong),
            htmlSnippet: $c.find('.card__price-container').html()?.slice(0, 200),
          })
        }
      })
    }
    await new Promise((r) => setTimeout(r, 1100))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
