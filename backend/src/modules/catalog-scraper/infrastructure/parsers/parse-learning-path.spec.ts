import { describe, expect, it } from 'vitest'
import { CatalogParseError } from '../../domain/errors'
import { loadFixture } from './load-fixture'
import { parseLearningPath } from './parse-learning-path'

describe('parseLearningPath', () => {
  it('parses programas-react with all buckets and clean URLs', () => {
    const path = parseLearningPath(
      loadFixture('path-programas-react.html'),
      'programas-react',
    )

    expect(path.id).toBe('programas-react')
    expect(path.pagePath).toBe('/pages/programas-react')
    expect(path.title).toMatch(/React/i)

    expect(path.buckets.REQUIRED.length).toBeGreaterThan(0)
    expect(path.buckets.RECOMMENDED.length).toBeGreaterThan(0)
    expect(path.buckets.OPTIONAL.length).toBeGreaterThan(0)
    expect(path.buckets.ANYTIME.length).toBeGreaterThan(0)

    const react = path.entries.find((e) => e.courseSlug === 'react-de-cero')
    expect(react?.bucket).toBe('REQUIRED')
    expect(react?.courseUrl).toBe(
      'https://cursos.devtalles.com/courses/react-de-cero',
    )
    expect(react?.courseUrl.includes('coupon')).toBe(false)
    expect(react?.tags.length).toBeGreaterThan(0)

    const positions = path.entries.map((e) => e.position)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('exposes an empty ANYTIME bucket on ruta-python', () => {
    const path = parseLearningPath(
      loadFixture('path-ruta-python.html'),
      'ruta-python',
    )

    expect(path.id).toBe('ruta-python')
    expect(path.buckets.REQUIRED.length).toBeGreaterThan(0)
    expect(path.buckets.RECOMMENDED.length).toBeGreaterThan(0)
    expect(path.buckets.OPTIONAL.length).toBeGreaterThan(0)
    expect(path.buckets.ANYTIME).toEqual([])
    expect(path.entries.every((e) => e.bucket !== 'ANYTIME')).toBe(true)

    const python = path.entries.find((e) => e.courseSlug === 'python')
    expect(python?.courseUrl.includes('?')).toBe(false)
  })

  it('preserves appearance order across buckets', () => {
    const path = parseLearningPath(
      loadFixture('path-programas-react.html'),
      'programas-react',
    )

    for (let i = 1; i < path.entries.length; i++) {
      expect(path.entries[i]!.position).toBeGreaterThan(
        path.entries[i - 1]!.position,
      )
    }
  })

  it('throws CatalogParseError on unexpected HTML', () => {
    expect(() =>
      parseLearningPath(loadFixture('invalid-page.html'), 'programas-react'),
    ).toThrow(CatalogParseError)
  })
})
