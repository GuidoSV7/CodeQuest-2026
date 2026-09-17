import * as cheerio from 'cheerio'
import type { AnyNode, Element } from 'domhandler'

export const SITE_ORIGIN = 'https://cursos.devtalles.com'

export function loadHtml(html: string): cheerio.CheerioAPI {
  return cheerio.load(html)
}

export function cleanText(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hasClassPrefix(
  el: Element,
  prefix: string,
): boolean {
  const cls = el.attribs?.class ?? ''
  return cls.split(/\s+/).some((c) => c === prefix || c.startsWith(`${prefix}___`))
}

export function parseMoney(raw: string): { amount: number; currency: 'USD' } {
  const text = cleanText(raw)
  if (/gratis/i.test(text)) {
    return { amount: 0, currency: 'USD' }
  }
  const match = text.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d+)?)/)
  if (!match) {
    throw new Error(`Unrecognized price: ${raw}`)
  }
  return { amount: Number(match[1]), currency: 'USD' }
}

export function absoluteCourseUrl(slugOrPath: string): string {
  if (slugOrPath.startsWith('http')) {
    const u = new URL(slugOrPath)
    u.search = ''
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  }
  const path = slugOrPath.startsWith('/') ? slugOrPath : `/courses/${slugOrPath}`
  return `${SITE_ORIGIN}${path.split('?')[0]}`
}

export function extractSlugFromHref(href: string): string {
  const cleaned = href.split('?')[0]!.split('#')[0]!
  const marker = '/courses/'
  const idx = cleaned.indexOf(marker)
  if (idx === -1) {
    throw new Error(`Not a course href: ${href}`)
  }
  const raw = cleaned.slice(idx + marker.length).replace(/\/$/, '')
  return decodeURIComponent(raw)
}

export function stripQuery(url: string): string {
  const u = new URL(url, SITE_ORIGIN)
  u.search = ''
  u.hash = ''
  return u.toString().replace(/\/$/, '')
}

export function metaContent(
  $: cheerio.CheerioAPI,
  nameOrProperty: string,
): string | null {
  const byName = $(`meta[name="${nameOrProperty}"]`).attr('content')
  if (byName) return cleanText(byName)
  const byProp = $(`meta[property="${nameOrProperty}"]`).attr('content')
  return byProp ? cleanText(byProp) : null
}

export function textOf($el: cheerio.Cheerio<AnyNode>): string {
  return cleanText($el.text())
}
