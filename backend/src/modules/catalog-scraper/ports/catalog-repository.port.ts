import type { CatalogSnapshot } from '../domain/catalog'

export type CatalogRepository = {
  getCurrent(): Promise<CatalogSnapshot | null>
  /** Pointer value of `catalog:current` (`vN`), without reading the snapshot JSON. */
  getCurrentVersion?(): Promise<string | null>
  save(catalog: CatalogSnapshot): Promise<CatalogSnapshot>
}

export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY')

export const REDIS_KEYS = {
  current: 'catalog:current',
  previous: 'catalog:previous',
  version: (n: number) => `catalog:v${n}`,
  lock: 'catalog:lock',
} as const
