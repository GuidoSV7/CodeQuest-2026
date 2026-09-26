import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import { createLearningPathGenerator } from './learning-path-generator'

const seed = JSON.parse(
  readFileSync(
    path.resolve(process.cwd(), 'src/modules/catalog-scraper/data/catalog.seed.json'),
    'utf8',
  ),
) as CatalogSnapshot

describe('generate_learning_path against the seed', () => {
  const generator = createLearningPathGenerator()

  it.each(['React', 'frontend', 'backend', 'móvil'])('returns a diagram for %s', (goal) => {
    const pathResult = generator.generate(seed, {
      goal,
      knownCourseIds: ['100'],
      includeOptional: true,
      fromSeed: true,
    })
    expect(pathResult.diagram.mermaid).toContain('flowchart')
    expect(pathResult.strategy === 'official_path' || pathResult.strategy === 'catalog_search').toBe(true)
    expect(pathResult.items.every((item) => typeof item.partial === 'boolean')).toBe(true)
  })
})
