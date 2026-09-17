import type { CatalogLock } from '../../ports/catalog-lock.port'

type Entry = { expiresAt: number }

/** Process-local lock for tests and single-instance dry runs. */
export function createMemoryCatalogLock(now: () => number = Date.now): CatalogLock {
  const locks = new Map<string, Entry>()

  return {
    async tryAcquire(key, ttlMs) {
      const t = now()
      const current = locks.get(key)
      if (current && current.expiresAt > t) return false
      locks.set(key, { expiresAt: t + ttlMs })
      return true
    },
    async release(key) {
      locks.delete(key)
    },
  }
}
