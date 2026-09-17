import type { CatalogSnapshot } from '../../domain/catalog'
import type { CatalogRepository } from '../../ports/catalog-repository.port'

/**
 * Wraps a catalog repository so `save` never persists.
 * Used for dry-run sync without modifying the real Redis repository.
 */
export function createDryRunCatalogRepository(
  inner: CatalogRepository,
): CatalogRepository {
  return {
    getCurrent: () => inner.getCurrent(),
    async save(catalog: CatalogSnapshot) {
      const current = await inner.getCurrent()
      const nextVersion = (current?.version ?? 0) + 1
      return { ...catalog, version: nextVersion }
    },
  }
}
