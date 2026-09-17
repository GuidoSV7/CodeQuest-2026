import { CatalogParseError } from '../../domain/errors'
import type { CourseListingItem } from '../../domain/models'
import {
  absoluteCourseUrl,
  extractSlugFromHref,
  loadHtml,
  parseMoney,
  textOf,
} from './html-utils'

/**
 * Parses a DevTalles category listing page into course cards.
 * Pure function — no I/O.
 */
export function parseCourseListing(html: string): CourseListingItem[] {
  const $ = loadHtml(html)
  const cards = $('a.card.card--curso, a.card.card--published.card--curso')

  if (cards.length === 0) {
    throw new CatalogParseError(
      'parseCourseListing: no course cards found (unexpected HTML structure)',
    )
  }

  const items: CourseListingItem[] = []

  cards.each((_, el) => {
    const $card = $(el)
    const href = $card.attr('href')
    if (!href || !href.includes('/courses/')) return

    const slug = extractSlugFromHref(href)
    const title = textOf($card.find('h3.card__name').first())
    if (!title) {
      throw new CatalogParseError('parseCourseListing: card without title', {
        slug,
      })
    }

    const shortRaw = textOf($card.find('p.card__description').first())
    const info = textOf($card.find('span.card__product-info').first())
    const lessonsMatch = info.match(/(\d+)\s*lecciones/i)

    const $price = $card.find('p.card__price').first()
    const isFree = $price.find('.card__badge--free').length > 0
    let price: CourseListingItem['price']
    if (isFree) {
      price = { amount: 0, currency: 'USD' }
    } else {
      const strong = textOf($price.find('strong').first()) || textOf($price)
      // Cursos "próximamente"/en construcción: card sin precio → price null (no abortar el listing).
      price = strong.trim() ? parseMoney(strong) : null
    }

    const isNew = $card.find('.card__badge--new').length > 0

    items.push({
      id: null,
      slug,
      url: absoluteCourseUrl(href),
      title,
      shortDescription: shortRaw || null,
      lessonsCount: lessonsMatch ? Number(lessonsMatch[1]) : null,
      price,
      isNew,
    })
  })

  if (items.length === 0) {
    throw new CatalogParseError(
      'parseCourseListing: cards present but none yielded course items',
    )
  }

  return items
}
