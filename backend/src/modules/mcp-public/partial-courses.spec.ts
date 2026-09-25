import { describe, expect, it } from 'vitest'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import { getOfficialPath, searchCourses } from './catalog-read'
import { createLearningPathGenerator } from './learning-path-generator'

function partialCatalog(): CatalogSnapshot {
  const courseOk = {
    id: 1,
    slug: 'publicado',
    title: 'Curso publicado',
    subtitleLabel: null,
    metaDescription: 'servidores http',
    description: null,
    coverImageUrl: null,
    previewYoutubeId: null,
    price: { amount: 10, currency: 'USD' as const },
    lessonCount: 1,
    videoHours: 1,
    instructor: null,
    hasSubtitles: false,
    prerequisites: [],
    sections: [],
    relatedCourses: [],
    learningPathUrl: null,
    sourceUrl: 'https://cursos.devtalles.com/courses/publicado',
    categories: ['all' as const],
    scrapedAt: '2026-09-21T00:00:00.000Z',
    relatedCourseIds: [],
    status: 'ok' as const,
  }
  const coursePartial = {
    ...courseOk,
    id: 2,
    slug: 'a-medias',
    title: 'Curso parcial',
    metaDescription: 'borrador',
    sourceUrl: 'https://cursos.devtalles.com/courses/a-medias',
    status: 'partial' as const,
  }
  const requiredOk = {
    bucket: 'REQUIRED' as const,
    courseSlug: 'publicado',
    courseUrl: courseOk.sourceUrl,
    label: courseOk.title,
    tags: [],
    position: 0,
    courseId: 1,
  }
  const requiredPartial = {
    bucket: 'REQUIRED' as const,
    courseSlug: 'a-medias',
    courseUrl: coursePartial.sourceUrl,
    label: coursePartial.title,
    tags: [],
    position: 1,
    courseId: 2,
  }
  return {
    version: 3,
    generatedAt: '2026-09-21T00:00:00.000Z',
    source: 'scraper',
    courses: [courseOk, coursePartial],
    paths: [
      {
        id: 'programas-react',
        title: 'React',
        pagePath: '/pages/programas-react',
        scrapedAt: '2026-09-21T00:00:00.000Z',
        entries: [requiredOk, requiredPartial],
        buckets: {
          REQUIRED: [requiredOk, requiredPartial],
          RECOMMENDED: [],
          OPTIONAL: [],
          ANYTIME: [],
        },
      },
    ],
    stats: {
      courseCount: 2,
      pathCount: 1,
      categoryCounts: { all: 2, wip: 0, free: 0, mini: 0, exclusive: 0, legacy: 0 },
    },
  }
}

describe('partial courses', () => {
  it('includes a partial required course on the official path and the generated path, and hides it from search', () => {
    const snap = partialCatalog()
    const generated = createLearningPathGenerator().generate(snap, {
      goal: 'React',
      knownCourseIds: [],
      includeOptional: false,
    })
    const generatedPartial = generated.items.find((item) => item.course_id === '2')
    expect(generatedPartial?.partial).toBe(true)
    expect(generated.diagram.mermaid).toContain('c2[')
    expect(generated.diagram.mermaid).toContain(':::requiredPartial')

    const official = getOfficialPath(snap, 'programas-react')
    const officialPartial = official.path.courses.find((item) => item.course_id === '2')
    expect(officialPartial?.partial).toBe(true)
    expect(official.path.diagram.mermaid).toContain(':::requiredPartial')

    const search = searchCourses(snap, { query: 'Curso parcial' })
    expect(search.courses.map((course) => course.id)).not.toContain('2')
  })
})
