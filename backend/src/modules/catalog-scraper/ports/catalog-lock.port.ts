export type CatalogLock = {
  tryAcquire(key: string, ttlMs: number): Promise<boolean>
  release(key: string): Promise<void>
}

export const CATALOG_LOCK = Symbol('CATALOG_LOCK')
