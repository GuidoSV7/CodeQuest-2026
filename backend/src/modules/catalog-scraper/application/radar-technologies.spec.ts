import { describe, expect, it } from 'vitest'
import type { CatalogSnapshot } from '../domain/catalog'
import { radarTechnologies } from './radar-technologies'

describe('radarTechnologies', () => {
  it('returns official path titles from the scraped snapshot', () => {
    const snapshot = {
      paths: [
        { id: 'programas-react', title: 'Programa de React' },
        { id: 'ruta-python', title: 'Ruta Python' },
        { id: 'programas-nest', title: 'Programa de NestJS' },
      ],
    } as CatalogSnapshot

    expect(radarTechnologies(snapshot)).toEqual([
      'Programa de React',
      'Ruta Python',
      'Programa de NestJS',
    ])
  })
})
