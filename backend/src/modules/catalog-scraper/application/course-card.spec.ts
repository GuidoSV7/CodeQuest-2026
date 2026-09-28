import { describe, expect, it } from 'vitest'
import type { CatalogSnapshot } from '../domain/catalog'
import {
  buildExampleSnapshot,
  EXAMPLE_COURSE_ID,
  EXAMPLE_COVER_IMAGE_URL,
  readCourseCardExample,
} from '../test/course-card-example'
import { allowedCoverImageUrl, toCourseCard, type CourseCard } from './course-card'

describe('toCourseCard', () => {
  it('returns the scraped video, syllabus, prerequisites, price and related courses', () => {
    const snapshot = {
      courses: [
        {
          id: 3306165,
          slug: 'csharp',
          title: 'C#: Empieza tu camino en el lenguaje',
          description: 'Primeros pasos',
          instructor: 'Teddy Paz',
          lessonCount: 120,
          videoHours: 11.5,
          previewYoutubeId: 'h9qGQuJGhTo',
          coverImageUrl: 'https://import.cdn.thinkific.com/643563/ozPWxfNjQBKugksdaogB_VSCODE.jpg',
          prerequisites: ['Saber usar una computadora'],
          price: { amount: 40, currency: 'USD' },
          sourceUrl: 'https://cursos.devtalles.com/courses/csharp',
          sections: [
            {
              index: 0,
              title: 'Sección 1',
              lessons: [{ index: 0, title: 'Bienvenida', isFreePreview: true }],
            },
          ],
          relatedCourses: [
            { id: null, slug: 'NET-Backend', title: '.NET Backend', url: 'https://cursos.devtalles.com/courses/NET-Backend' },
          ],
        },
      ],
      paths: [
        {
          id: 'ruta-c',
          entries: [{ courseId: 3306165, tags: ['backend'] }],
        },
      ],
    } as unknown as CatalogSnapshot

    expect(toCourseCard(snapshot, '3306165')).toStrictEqual({
      description: 'Primeros pasos',
      instructor: 'Teddy Paz',
      lessonCount: 120,
      videoHours: 11.5,
      previewYoutubeId: 'h9qGQuJGhTo',
      coverImageUrl: 'https://import.cdn.thinkific.com/643563/ozPWxfNjQBKugksdaogB_VSCODE.jpg',
      prerequisites: ['Saber usar una computadora'],
      tags: ['backend'],
      sections: [{ title: 'Sección 1', lessons: ['Bienvenida'] }],
      url: 'https://cursos.devtalles.com/courses/csharp',
      price: { amount: 40, currency: 'USD' },
      related: [{ title: '.NET Backend', url: 'https://cursos.devtalles.com/courses/NET-Backend' }],
    })
  })

  it('exposes a null cover when the scraped cover is not allowed', () => {
    const card = toCourseCard(buildExampleSnapshot('https://evil.example.com/a.jpg'), EXAMPLE_COURSE_ID)

    expect(card).not.toBeNull()
    expect(card !== null && 'coverImageUrl' in card).toBe(true)
    expect(card?.coverImageUrl).toBeNull()
  })
})

describe('allowedCoverImageUrl', () => {
  it('keeps an https cover from the Thinkific CDN untouched', () => {
    expect(allowedCoverImageUrl(EXAMPLE_COVER_IMAGE_URL)).toBe(EXAMPLE_COVER_IMAGE_URL)
  })

  it.each([
    ['another host', 'https://evil.example.com/a.jpg'],
    ['plain http', 'http://import.cdn.thinkific.com/a.jpg'],
    ['a misleading host suffix', 'https://import.cdn.thinkific.com.evil.com/a.jpg'],
    ['credentials', 'https://user:pw@import.cdn.thinkific.com/a.jpg'],
    ['an explicit port', 'https://import.cdn.thinkific.com:8443/a.jpg'],
    ['a malformed value', 'not a url'],
    ['an empty string', ''],
    ['null', null],
  ])('rejects %s', (_label, raw) => {
    expect(allowedCoverImageUrl(raw)).toBeNull()
  })
})

describe('CourseCard contract (provider side)', () => {
  const COURSE_CARD_KEYS = {
    description: true,
    instructor: true,
    lessonCount: true,
    videoHours: true,
    previewYoutubeId: true,
    coverImageUrl: true,
    prerequisites: true,
    tags: true,
    sections: true,
    url: true,
    price: true,
    related: true,
  } satisfies Record<keyof CourseCard, true>

  it('maps the catalog course to contracts/course-card.example.json', () => {
    expect(toCourseCard(buildExampleSnapshot(), EXAMPLE_COURSE_ID)).toStrictEqual(readCourseCardExample())
  })

  it('keeps the shared example in sync with every CourseCard key', () => {
    const example = readCourseCardExample()

    expect(typeof example === 'object' && example !== null).toBe(true)
    expect(Object.keys(example ?? {}).sort()).toEqual(Object.keys(COURSE_CARD_KEYS).sort())
  })
})
