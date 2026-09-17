import { describe, expect, it } from 'vitest'
import { CatalogParseError } from '../../domain/errors'
import { loadFixture } from './load-fixture'
import { parseCourseListing } from './parse-course-listing'

describe('parseCourseListing', () => {
  it('parses all course cards from the full listing', () => {
    const html = loadFixture('listing-all.html')
    const items = parseCourseListing(html)

    expect(items.length).toBeGreaterThanOrEqual(50)
    expect(items.every((i) => i.id === null)).toBe(true)

    const golang = items.find((i) => i.slug === 'golang-backend-profesional')
    expect(golang).toMatchObject({
      slug: 'golang-backend-profesional',
      url: 'https://cursos.devtalles.com/courses/golang-backend-profesional',
      title: expect.stringContaining('Golang'),
      lessonsCount: 257,
      price: { amount: 60, currency: 'USD' },
    })
    expect(golang?.shortDescription).toBeTruthy()
  })

  it('preserves unicode and uppercase slugs as they appear (decoded)', () => {
    const items = parseCourseListing(loadFixture('listing-all.html'))

    const unicode = items.find((i) => i.slug === 'Ingeniería-de-prompts')
    expect(unicode).toBeDefined()
    expect(unicode?.url).toContain('/courses/Ingenier')

    const upper = items.find((i) => i.slug === 'spring-AI')
    expect(upper).toBeDefined()
    expect(upper?.slug).toBe('spring-AI')
  })

  it('parses free listing with price 0 and free badge courses', () => {
    const items = parseCourseListing(loadFixture('listing-free.html'))

    expect(items.length).toBeGreaterThanOrEqual(1)
    expect(items.every((i) => i.price.amount === 0)).toBe(true)

    const vscode = items.find((i) => i.slug === 'visual-studio-code')
    expect(vscode).toBeDefined()
    expect(vscode?.price).toEqual({ amount: 0, currency: 'USD' })
  })

  it('detects isNew from NUEVO badge', () => {
    const items = parseCourseListing(loadFixture('listing-all.html'))
    const neu = items.find(
      (i) => i.slug === 'git-github-control-versiones-desde-cero',
    )
    expect(neu?.isNew).toBe(true)

    const notNew = items.find((i) => i.slug === 'ia-para-developers')
    expect(notNew?.isNew).toBe(false)
  })

  it('throws CatalogParseError on unexpected HTML (not empty array)', () => {
    expect(() => parseCourseListing(loadFixture('invalid-page.html'))).toThrow(
      CatalogParseError,
    )
  })
})
