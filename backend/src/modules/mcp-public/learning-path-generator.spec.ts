import { describe, expect, it } from 'vitest'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import type { PathBucket } from '../catalog-scraper/domain/models'
import { resolveOfficialPath } from './resolve-alias'
import { createLearningPathGenerator } from './learning-path-generator'

function course(
  id: number,
  slug: string,
  title: string,
  extra: Partial<CatalogSnapshot['courses'][number]> = {},
): CatalogSnapshot['courses'][number] {
  return {
    subtitleLabel: null,
    metaDescription: extra.metaDescription ?? null,
    description: extra.description ?? null,
    coverImageUrl: null,
    previewYoutubeId: null,
    price: extra.price ?? { amount: 10, currency: 'USD' },
    lessonCount: 4,
    videoHours: 2,
    instructor: 'Fernando Herrera',
    hasSubtitles: false,
    prerequisites: [],
    sections: [],
    relatedCourses: [],
    learningPathUrl: null,
    sourceUrl: `https://cursos.devtalles.com/courses/${slug}`,
    categories: ['all'],
    scrapedAt: '2026-09-21T00:00:00.000Z',
    relatedCourseIds: [],
    status: 'ok',
    ...extra,
    id,
    slug,
    title,
  }
}

function entry(
  position: number,
  bucket: PathBucket,
  courseId: number | null,
  slug: string,
  label: string,
) {
  return {
    bucket,
    courseSlug: slug,
    courseUrl: `https://cursos.devtalles.com/courses/${slug}`,
    label,
    tags: ['frontend'],
    position,
    courseId,
  }
}

function catalog(): CatalogSnapshot {
  const reactRequired = entry(1, 'REQUIRED', 3395229, 'react-de-cero', 'React: de cero a experto')
  const reactRec = entry(0, 'RECOMMENDED', 111, 'js-moderno', 'JavaScript Moderno: Guía para dominar el lenguaje')
  const reactOpt = entry(3, 'OPTIONAL', 222, 'react-pro', 'React pro "patrones"')
  const reactAny = entry(4, 'ANYTIME', 333, 'react-any', 'React anytime')
  const missing = entry(5, 'REQUIRED', null, 'no-publicado', 'Curso fantasma')
  const courses = [
    course(3395229, 'react-de-cero', 'React: de cero a experto'),
    course(111, 'js-moderno', 'JavaScript Moderno: Guía para dominar el lenguaje'),
    course(222, 'react-pro', 'React pro "patrones"', {
      metaDescription: 'hooks avanzados',
    }),
    course(333, 'react-any', 'React anytime'),
    course(999, 'go-basico', 'Go básico'),
    course(1000, 'go-apis', 'Go APIs', {
      metaDescription: 'servidores http',
    }),
  ]
  return {
    version: 7,
    generatedAt: '2026-09-21T00:00:00.000Z',
    source: 'scraper',
    courses,
    paths: [
      {
        id: 'programas-react',
        title: 'Ruta de aprendizaje React',
        pagePath: '/pages/programas-react',
        scrapedAt: '2026-09-21T00:00:00.000Z',
        entries: [reactRec, reactRequired, reactOpt, reactAny, missing],
        buckets: {
          REQUIRED: [reactRequired, missing],
          RECOMMENDED: [reactRec],
          OPTIONAL: [reactOpt],
          ANYTIME: [reactAny],
        },
      },
    ],
    stats: {
      courseCount: courses.length,
      pathCount: 1,
      categoryCounts: {
        all: courses.length,
        wip: 0,
        free: 0,
        mini: 0,
        exclusive: 0,
        legacy: 0,
      },
    },
  }
}

describe('alias resolution', () => {
  it('normalizes case, accents and spacing', () => {
    expect(resolveOfficialPath('  RÉACT  ')).toBe('programas-react')
    expect(resolveOfficialPath('reactjs')).toBe('programas-react')
    expect(resolveOfficialPath('NestJS')).toBe('programas-nest')
    expect(resolveOfficialPath('móvil')).toBe('ruta-dart')
  })

  it('prefers the longest alias', () => {
    expect(resolveOfficialPath('nodejs avanzado')).toBe('programas-node')
  })
})

describe('learning path generator v1', () => {
  const generator = createLearningPathGenerator()

  it('uses the official path when an alias matches', () => {
    const out = generator.generate(catalog(), {
      goal: 'React',
      knownCourseIds: [],
      includeOptional: false,
    })
    expect(out.strategy).toBe('official_path')
    expect(out.source_path_id).toBe('programas-react')
    expect(out.items.map((item) => item.course_id)).toEqual(['111', '3395229'])
    expect(out.items.find((item) => item.course_id === '999')).toBeUndefined()
  })

  it('falls back to catalog search when no alias matches', () => {
    const out = generator.generate(catalog(), {
      goal: 'servidores http',
      knownCourseIds: [],
      includeOptional: false,
    })
    expect(out.strategy).toBe('catalog_search')
    expect(out.source_path_id).toBeNull()
    expect(out.items[0]?.course_id).toBe('1000')
    expect(out.edges_meta.kind).toBe('linear_ranked')
  })

  it('marks known course ids and keeps them out of invented ids', () => {
    const out = generator.generate(catalog(), {
      goal: 'React',
      knownCourseIds: ['3395229', '404404'],
      includeOptional: false,
    })
    expect(out.items.find((item) => item.course_id === '3395229')?.already_known).toBe(true)
    expect(out.items.some((item) => item.course_id === '404404')).toBe(false)
  })

  it('excludes optional and anytime unless include_optional is true', () => {
    const closed = generator.generate(catalog(), {
      goal: 'React',
      knownCourseIds: [],
      includeOptional: false,
    })
    expect(closed.items.map((item) => item.bucket).sort()).toEqual(['recommended', 'required'])

    const open = generator.generate(catalog(), {
      goal: 'React',
      knownCourseIds: [],
      includeOptional: true,
    })
    expect(open.items.map((item) => item.bucket).sort()).toEqual([
      'anytime',
      'optional',
      'recommended',
      'required',
    ])
  })

  it('omits an official-path course that is absent from the current catalog', () => {
    const snap = catalog()
    snap.courses = snap.courses.filter((item) => item.id !== 111)
    const out = generator.generate(snap, {
      goal: 'React',
      knownCourseIds: [],
      includeOptional: false,
    })
    expect(out.items.map((item) => item.course_id)).toEqual(['3395229'])
    expect(out.notes).toMatch(/omitieron|no están publicados|ausente/i)
  })

  it('is deterministic', () => {
    const input = {
      goal: 'React',
      knownCourseIds: ['3395229'],
      includeOptional: true,
    }
    const a = generator.generate(catalog(), input)
    const b = generator.generate(catalog(), input)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
