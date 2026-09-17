import type { CatalogSnapshot } from '../domain/catalog'
import type { CatalogRepository } from '../ports/catalog-repository.port'
import { importCatalogSeed } from './seed'

export type BootstrapSource = 'redis' | 'seed-imported' | 'seed-memory'

export type BootstrapResult = {
  catalog: CatalogSnapshot
  source: BootstrapSource
  warnings: string[]
}

export type BootstrapCatalogDeps = {
  catalogRepository: CatalogRepository
  loadSeedJson: () => string
}

/**
 * Ensures the app has a catalog at startup without requiring a live scrape.
 */
export async function bootstrapCatalog(
  deps: BootstrapCatalogDeps,
): Promise<BootstrapResult> {
  const warnings: string[] = []

  try {
    const current = await deps.catalogRepository.getCurrent()
    if (current) {
      return { catalog: current, source: 'redis', warnings }
    }

    const imported = await importCatalogSeed(
      deps.catalogRepository,
      deps.loadSeedJson(),
    )
    return { catalog: imported, source: 'seed-imported', warnings }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    warnings.push(
      `Redis unavailable at boot (${message}); serving catalog.seed.json from memory`,
    )
    const parsed = JSON.parse(deps.loadSeedJson()) as CatalogSnapshot
    return {
      catalog: { ...parsed, source: 'seed', version: 0 },
      source: 'seed-memory',
      warnings,
    }
  }
}
