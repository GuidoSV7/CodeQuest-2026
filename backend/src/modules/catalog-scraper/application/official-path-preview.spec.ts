import { describe, expect, it } from 'vitest'
import type { CatalogSnapshot } from '../domain/catalog'
import { officialPathPreview } from './official-path-preview'

describe('officialPathPreview', () => {
  const snapshot = {
    courses: [
      { id: 10, status: 'ok' },
      { id: 11, status: 'ok' },
    ],
    paths: [
      {
        id: 'programas-react',
        title: 'Programa de React',
        entries: [
          {
            courseId: 11,
            label: 'React Hooks',
            bucket: 'OPTIONAL',
            position: 2,
            courseUrl: 'https://cursos.devtalles.com/courses/hooks',
          },
          {
            courseId: 10,
            label: 'React desde cero',
            bucket: 'REQUIRED',
            position: 0,
            courseUrl: 'https://cursos.devtalles.com/courses/react',
          },
        ],
      },
    ],
  } as unknown as CatalogSnapshot

  it('returns published courses of an official path without saving a user route', () => {
    expect(officialPathPreview(snapshot, 'programas-react')).toEqual({
      catalogPathId: 'programas-react',
      items: [
        {
          courseId: '10',
          courseTitle: 'React desde cero',
          bucket: 'required',
          position: 0,
        },
        {
          courseId: '11',
          courseTitle: 'React Hooks',
          bucket: 'optional',
          position: 2,
        },
      ],
    })
  })

  it('returns null when the id is not an official path', () => {
    expect(officialPathPreview(snapshot, 'ruta-inventada')).toBeNull()
  })
})
