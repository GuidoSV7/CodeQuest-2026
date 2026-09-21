import type {
  OAuthStatePayload,
  OAuthStateStore,
} from '../ports/oauth-state-store.port'

type Entry = {
  payload: OAuthStatePayload
  expiresAt: number
}

/**
 * Process-local OAuth state store (tests / single-instance).
 * Optional `now` injection enables deterministic TTL tests.
 */
export function createMemoryOAuthStateStore(
  now: () => number = Date.now,
): OAuthStateStore {
  const entries = new Map<string, Entry>()

  return {
    async save(state, payload, ttlSeconds) {
      entries.set(state, {
        payload,
        expiresAt: now() + ttlSeconds * 1000,
      })
    },

    async consume(state) {
      const entry = entries.get(state)
      if (!entry) return null
      entries.delete(state)
      if (entry.expiresAt <= now()) return null
      return entry.payload
    },
  }
}

/** Redis-like KV with get/set/del — used when a real Redis client is unavailable. */
export type RedisLikeKv = {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  del(...keys: string[]): Promise<number>
}

type StoredValue = {
  payload: OAuthStatePayload
  expiresAt: number
}

/**
 * OAuth state over a Redis-like key/value store.
 * TTL is enforced via expiresAt in the JSON value (works without SETEX).
 */
export function createRedisLikeOAuthStateStore(
  redis: RedisLikeKv,
  options: { keyPrefix?: string; now?: () => number } = {},
): OAuthStateStore {
  const keyPrefix = options.keyPrefix ?? 'oauth:state:'
  const now = options.now ?? Date.now

  return {
    async save(state, payload, ttlSeconds) {
      const value: StoredValue = {
        payload,
        expiresAt: now() + ttlSeconds * 1000,
      }
      await redis.set(`${keyPrefix}${state}`, JSON.stringify(value))
    },

    async consume(state) {
      const key = `${keyPrefix}${state}`
      const raw = await redis.get(key)
      if (!raw) return null
      await redis.del(key)
      let parsed: StoredValue
      try {
        parsed = JSON.parse(raw) as StoredValue
      } catch {
        return null
      }
      if (!parsed?.payload || typeof parsed.expiresAt !== 'number') return null
      if (parsed.expiresAt <= now()) return null
      return parsed.payload
    },
  }
}
