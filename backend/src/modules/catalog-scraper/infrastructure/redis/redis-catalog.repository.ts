import type { CatalogSnapshot } from '../../domain/catalog'
import type { CatalogRepository } from '../../ports/catalog-repository.port'
import { REDIS_KEYS } from '../../ports/catalog-repository.port'
import type { RedisLike } from './in-memory-redis'

export type RedisCatalogRepositoryOptions = {
  retainPreviousVersions?: number
}

export function createRedisCatalogRepository(
  redis: RedisLike,
  options: RedisCatalogRepositoryOptions = {},
): CatalogRepository {
  const retain = options.retainPreviousVersions ?? 1

  return {
    async getCurrent() {
      const pointer = await redis.get(REDIS_KEYS.current)
      if (!pointer) return null
      const payload = await redis.get(`catalog:${pointer}`)
      if (!payload) return null
      return JSON.parse(payload) as CatalogSnapshot
    },

    async save(catalog: CatalogSnapshot) {
      const currentPointer = await redis.get(REDIS_KEYS.current)
      const currentN = currentPointer
        ? Number(String(currentPointer).replace(/^v/, ''))
        : 0
      const nextN = Number.isFinite(currentN) ? currentN + 1 : 1
      const nextPointer = `v${nextN}`
      const versionKey = REDIS_KEYS.version(nextN)

      const toStore: CatalogSnapshot = {
        ...catalog,
        version: nextN,
      }

      // 1) Persist full payload first — if this fails, current stays untouched.
      await redis.set(versionKey, JSON.stringify(toStore))

      // 2) Move pointers (previous + current).
      const pointerEntries: Array<[string, string]> = []
      if (currentPointer) {
        pointerEntries.push([REDIS_KEYS.previous, currentPointer])
      }
      pointerEntries.push([REDIS_KEYS.current, nextPointer])
      await redis.multiSet(pointerEntries)

      // 3) GC: keep current + `retain` previous versions.
      const oldestToKeep = nextN - retain
      if (oldestToKeep > 1) {
        const toDelete: string[] = []
        for (let n = 1; n < oldestToKeep; n++) {
          toDelete.push(REDIS_KEYS.version(n))
        }
        if (toDelete.length) await redis.del(...toDelete)
      }

      return toStore
    },
  }
}
