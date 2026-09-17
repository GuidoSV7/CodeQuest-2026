import type { Cheerio, CheerioAPI } from 'cheerio'
import type { Element } from 'domhandler'
import { CatalogParseError } from '../../domain/errors'
import type { Course, Lesson, RelatedCourseRef, Section } from '../../domain/models'
import {
  absoluteCourseUrl,
  cleanText,
  extractSlugFromHref,
  loadHtml,
  metaContent,
  parseMoney,
  SITE_ORIGIN,
  textOf,
} from './html-utils'

/**
 * Parses a DevTalles course detail page into a Course.
 * Pure function — no I/O.
 */
export function parseCoursePage(html: string, slug: string): Course {
  const $ = loadHtml(html)

  const enrollIds = new Set<number>()
  $('a[href*="/enroll/"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const m = href.match(/\/enroll\/(\d+)/)
    if (m) enrollIds.add(Number(m[1]))
  })

  if (enrollIds.size === 0) {
    throw new CatalogParseError(
      'parseCoursePage: no /enroll/{id} found (unexpected HTML structure)',
      { slug },
    )
  }
  if (enrollIds.size > 1) {
    throw new CatalogParseError(
      'parseCoursePage: conflicting enroll IDs on page',
      { slug, enrollIds: [...enrollIds] },
    )
  }
  const id = [...enrollIds][0]!

  const $heading = $('h2.section__heading').first()
  const subtitleLabel = (() => {
    const t = textOf($heading.find('span.devtalles-course-subtitle').first())
    return t || null
  })()
  const title = cleanCourseTitle($heading, subtitleLabel)
  if (!title) {
    throw new CatalogParseError('parseCoursePage: missing course title', {
      slug,
    })
  }

  const details = parseDetails($)
  if (!details.price) {
    throw new CatalogParseError('parseCoursePage: missing price', { slug })
  }

  return {
    id,
    slug,
    title,
    subtitleLabel,
    metaDescription: metaContent($, 'description'),
    description: parseSpecColumn($, 'Descripción del curso'),
    coverImageUrl: metaContent($, 'og:image'),
    previewYoutubeId: extractYoutubeId($),
    price: details.price,
    lessonCount: details.lessonCount,
    videoHours: details.videoHours,
    instructor: details.instructor,
    hasSubtitles: details.hasSubtitles,
    prerequisites: parsePrerequisites($),
    sections: parseCurriculum($),
    relatedCourses: parseRelated($, slug),
    learningPathUrl: null,
    sourceUrl: `${SITE_ORIGIN}/courses/${slug}`,
  }
}

function cleanCourseTitle(
  $heading: Cheerio<Element>,
  subtitleLabel: string | null,
): string {
  const clone = $heading.clone()
  clone.find('span.devtalles-course-subtitle').remove()
  clone.find('style').remove()
  let title = textOf(clone)
  if (subtitleLabel) {
    title = title.replace(subtitleLabel, '').trim()
  }
  return title
}

function parseDetails($: CheerioAPI): {
  price: Course['price'] | null
  lessonCount: number | null
  videoHours: number | null
  instructor: string | null
  hasSubtitles: boolean
} {
  const items = $('li.course-curriculum-card__details-item')
    .toArray()
    .map((el) => textOf($(el)))
    .filter(Boolean)

  let price: Course['price'] | null = null
  let lessonCount: number | null = null
  let videoHours: number | null = null
  let instructor: string | null = null
  let hasSubtitles = false

  for (const item of items) {
    if (/gratis/i.test(item) || /\$/.test(item)) {
      try {
        price = parseMoney(item)
      } catch {
        /* ignore non-price */
      }
      continue
    }
    const lessons = item.match(/(\d+)\s*lecciones/i)
    if (lessons) {
      lessonCount = Number(lessons[1])
      continue
    }
    const hours = item.match(/(\d+(?:\.\d+)?)\s*horas/i)
    if (hours) {
      videoHours = Number(hours[1])
      continue
    }
    if (/subt[ií]tulos/i.test(item)) {
      hasSubtitles = true
      continue
    }
    if (
      !instructor &&
      item.length > 1 &&
      !/\$/.test(item) &&
      !/lecciones|horas|gratis|subt/i.test(item)
    ) {
      instructor = item
    }
  }

  if (!price) {
    const pt = textOf($('h3.pricing-table__list-item-details__price').first())
    if (pt) price = parseMoney(pt)
  }

  return { price, lessonCount, videoHours, instructor, hasSubtitles }
}

function extractYoutubeId($: CheerioAPI): string | null {
  const src =
    $('iframe[src*="youtube.com/embed/"]').attr('src') ??
    $('iframe[src*="youtu.be/"]').attr('src')
  if (!src) return null
  const m = src.match(/(?:embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return m?.[1] ?? null
}

function parseCurriculum($: CheerioAPI): Section[] {
  const sections: Section[] = []

  $('ol.course-curriculum__chapter-list > li').each((_, chapterEl) => {
    const $chapter = $(chapterEl)
    const title = textOf(
      $chapter.find('h3.course-curriculum__chapter-title').first(),
    )
    if (!title) return

    const lessons: Lesson[] = []
    // Free previews are <a>; locked lessons are often <span> with the same class.
    $chapter
      .find(
        'a.course-curriculum__chapter-lesson, span.course-curriculum__chapter-lesson, [class*="course-curriculum__chapter-lesson"]',
      )
      .each((__, lessonEl) => {
        const $lesson = $(lessonEl)
        // Skip the nested free-badge span (class also contains chapter-lesson--free).
        const cls = $lesson.attr('class') ?? ''
        if (cls.includes('chapter-lesson--free')) return

        const lessonTitle = textOf(
          $lesson.find('.course-curriculum__lesson-title p').first(),
        )
        if (!lessonTitle) return
        const isFreePreview =
          $lesson.find('[class*="course-curriculum__chapter-lesson--free"]')
            .length > 0
        lessons.push({
          index: lessons.length,
          title: lessonTitle,
          isFreePreview,
        })
      })

    sections.push({
      index: sections.length,
      title,
      lessons,
    })
  })

  return sections
}

function parsePrerequisites($: CheerioAPI): string[] {
  const $title = $('h3[class*="spec-column-title"]')
    .filter((_, el) => /Requisitos previos/i.test($(el).text()))
    .first()
  if ($title.length === 0) return []

  const $body = $title
    .parent()
    .find('div[class*="spec-inner-text"]')
    .first()
  if ($body.length === 0) return []

  const html = $body.html() ?? ''
  return html
    .split(/<br\s*\/?>/i)
    .flatMap((part) => part.split(/<\/p>/i))
    .map((part) =>
      cleanText(
        part
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>'),
      ),
    )
    .map((line) => line.replace(/^•\s*/, '').trim())
    .filter((line) => line.length > 0)
}

function parseSpecColumn($: CheerioAPI, heading: string): string | null {
  const $title = $('h3[class*="spec-column-title"]')
    .filter((_, el) => new RegExp(heading, 'i').test($(el).text()))
    .first()
  if ($title.length === 0) return null
  const $body = $title
    .parent()
    .find('div[class*="spec-inner-text"]')
    .first()
  const text = textOf($body)
  return text || null
}

function parseRelated($: CheerioAPI, currentSlug: string): RelatedCourseRef[] {
  const related: RelatedCourseRef[] = []
  const seen = new Set<string>()

  $('a.card.card--curso').each((_, el) => {
    const href = $(el).attr('href')
    if (!href || !href.includes('/courses/')) return
    const relatedSlug = extractSlugFromHref(href)
    if (relatedSlug === currentSlug || seen.has(relatedSlug)) return
    seen.add(relatedSlug)
    related.push({
      id: null,
      slug: relatedSlug,
      title: textOf($(el).find('h3.card__name').first()),
      url: absoluteCourseUrl(href),
    })
  })

  return related
}
