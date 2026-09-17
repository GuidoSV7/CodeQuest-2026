import { describe, expect, it } from 'vitest'
import { CatalogParseError } from '../../domain/errors'
import { loadFixture } from './load-fixture'
import { parseCoursePage } from './parse-course-page'

describe('parseCoursePage', () => {
  it('parses a paid course with full curriculum and youtube preview', () => {
    const course = parseCoursePage(
      loadFixture('course-paid.html'),
      'golang-backend-profesional',
    )

    expect(course.id).toBe(3805831)
    expect(course.slug).toBe('golang-backend-profesional')
    expect(course.title).toMatch(/Golang/i)
    expect(course.price).toEqual({ amount: 60, currency: 'USD' })
    expect(course.previewYoutubeId).toBe('_AdiOD2kFfM')
    expect(course.lessonCount).toBe(257)
    expect(course.videoHours).toBe(25.5)
    expect(course.instructor).toMatch(/Ricardo/i)
    expect(course.coverImageUrl).toContain('thinkific.com')
    expect(course.metaDescription).toBeTruthy()
    expect(course.description).toBeTruthy()
    expect(course.prerequisites.length).toBeGreaterThan(0)
    expect(course.sections.length).toBeGreaterThanOrEqual(15)

    const totalLessons = course.sections.reduce(
      (n, s) => n + s.lessons.length,
      0,
    )
    expect(totalLessons).toBeGreaterThanOrEqual(250)

    const freePreview = course.sections
      .flatMap((s) => s.lessons)
      .filter((l) => l.isFreePreview)
    expect(freePreview.length).toBeGreaterThan(0)

    expect(course.relatedCourses.length).toBeGreaterThanOrEqual(1)
    expect(course.relatedCourses[0]?.slug).toBeTruthy()
    expect(course.relatedCourses.every((r) => r.id === null)).toBe(true)
    expect(course.sourceUrl).toBe(
      'https://cursos.devtalles.com/courses/golang-backend-profesional',
    )
  })

  it('parses a free course with price 0', () => {
    const course = parseCoursePage(
      loadFixture('course-free.html'),
      'visual-studio-code',
    )

    expect(course.id).toBe(2009621)
    expect(course.price).toEqual({ amount: 0, currency: 'USD' })
    expect(course.subtitleLabel?.toLowerCase()).toContain('gratuit')
  })

  it('preserves unicode slug and numeric id as canonical key', () => {
    const course = parseCoursePage(
      loadFixture('course-unicode.html'),
      'Ingeniería-de-prompts',
    )

    expect(course.slug).toBe('Ingeniería-de-prompts')
    expect(course.id).toBe(3718763)
    expect(typeof course.id).toBe('number')
    expect(course.hasSubtitles).toBe(true)
  })

  it('preserves uppercase slug spring-AI', () => {
    const course = parseCoursePage(
      loadFixture('course-uppercase.html'),
      'spring-AI',
    )

    expect(course.slug).toBe('spring-AI')
    expect(course.id).toBe(3755151)
    expect(course.title).toMatch(/Spring AI/i)
  })

  it('returns null previewYoutubeId when there is no video (no throw)', () => {
    const course = parseCoursePage(
      loadFixture('course-no-preview.html'),
      'golang-backend-profesional',
    )

    expect(course.previewYoutubeId).toBeNull()
    expect(course.id).toBe(3805831)
  })

  it('parses the full curriculum, not only a collapsed preview', () => {
    const course = parseCoursePage(
      loadFixture('course-paid.html'),
      'golang-backend-profesional',
    )

    const titles = course.sections.map((s) => s.title)
    expect(titles.some((t) => /Bienvenida/i.test(t))).toBe(true)
    expect(titles.length).toBeGreaterThan(10)
    expect(
      course.sections.every((s) => s.lessons.every((l) => l.title.length > 0)),
    ).toBe(true)
  })

  it('throws CatalogParseError on unexpected HTML', () => {
    expect(() =>
      parseCoursePage(loadFixture('invalid-page.html'), 'whatever'),
    ).toThrow(CatalogParseError)
  })
})
