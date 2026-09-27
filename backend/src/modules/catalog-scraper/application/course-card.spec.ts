import { describe, expect, it } from 'vitest'
import type { CatalogSnapshot } from '../domain/catalog'
import { toCourseCard } from './course-card'

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

    expect(toCourseCard(snapshot, '3306165')).toEqual({
      description: 'Primeros pasos',
      instructor: 'Teddy Paz',
      lessonCount: 120,
      videoHours: 11.5,
      previewYoutubeId: 'h9qGQuJGhTo',
      prerequisites: ['Saber usar una computadora'],
      tags: ['backend'],
      sections: [{ title: 'Sección 1', lessons: ['Bienvenida'] }],
      url: 'https://cursos.devtalles.com/courses/csharp',
      price: { amount: 40, currency: 'USD' },
      related: [{ title: '.NET Backend', url: 'https://cursos.devtalles.com/courses/NET-Backend' }],
    })
  })
})
