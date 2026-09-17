import type { CatalogSnapshot } from '../domain/catalog'
import type { CatalogRepository } from '../ports/catalog-repository.port'

/** Export current Redis catalog as seed JSON (`source: "seed"`, `version: 0`). */
export async function exportCatalogSeed(
  repo: CatalogRepository,
): Promise<string> {
  const current = await repo.getCurrent()
  if (!current) {
    throw new Error('exportCatalogSeed: no current catalog in repository')
  }
  const seed: CatalogSnapshot = {
    ...current,
    version: 0,
    source: 'seed',
  }
  return `${JSON.stringify(seed, null, 2)}\n`
}

/** Import seed JSON into Redis via versioned save. */
export async function importCatalogSeed(
  repo: CatalogRepository,
  json: string,
): Promise<CatalogSnapshot> {
  const parsed = JSON.parse(json) as CatalogSnapshot
  const toSave: CatalogSnapshot = {
    ...parsed,
    source: 'seed',
  }
  return repo.save(toSave)
}
