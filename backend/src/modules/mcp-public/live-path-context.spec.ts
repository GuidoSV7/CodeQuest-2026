import { describe, expect, it } from 'vitest'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import { livePathAnnotation } from './live-path-context'

function snapshot(): CatalogSnapshot {
  const course = (id: number, instructor: string) =>
    ({
      id,
      instructor,
      status: 'ok',
    }) as CatalogSnapshot['courses'][number]

  const path = (id: string, title: string, tags: string[], courseId: number) =>
    ({
      id,
      title,
      entries: [
        {
          bucket: 'RECOMMENDED',
          courseSlug: id,
          courseUrl: 'https://cursos.devtalles.com/courses/' + id,
          label: title,
          tags,
          position: 0,
          courseId,
        },
      ],
    }) as CatalogSnapshot['paths'][number]

  return {
    courses: [course(10, 'Fernando Herrera'), course(11, 'Ana López')],
    paths: [
      path('ruta-c', 'Ruta .NET / C#', ['backend'], 10),
      path('programas-nest', 'NestJS', ['backend'], 11),
      path('programas-react', 'React', ['frontend'], 12),
    ],
  } as CatalogSnapshot
}

describe('livePathAnnotation', () => {
  it('names each course instructor and suggests official paths that share tags', () => {
    const note = livePathAnnotation(snapshot(), {
      sourcePathId: 'ruta-c',
      courseIds: ['10', '11'],
    })

    expect(note.instructors).toEqual({
      '10': 'Fernando Herrera',
      '11': 'Ana López',
    })
    expect(note.related_paths).toEqual([{ path_id: 'programas-nest', title: 'NestJS' }])
  })
})
