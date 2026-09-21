import { describe, expect, it } from 'vitest'
import {
  createMemoryOAuthStateStore,
  createRedisLikeOAuthStateStore,
} from './memory-oauth-state-store'

describe('createMemoryOAuthStateStore', () => {
  it('saves and consumes once', async () => {
    const store = createMemoryOAuthStateStore(() => 1_000)
    await store.save('abc', { returnTo: '/home', createdAt: 1_000 }, 600)
    const first = await store.consume('abc')
    expect(first).toEqual({ returnTo: '/home', createdAt: 1_000 })
    const second = await store.consume('abc')
    expect(second).toBeNull()
  })

  it('returns null for missing state', async () => {
    const store = createMemoryOAuthStateStore()
    expect(await store.consume('nope')).toBeNull()
  })

  it('returns null when expired', async () => {
    let now = 0
    const store = createMemoryOAuthStateStore(() => now)
    await store.save('stale', { returnTo: '/', createdAt: 0 }, 10)
    now = 11_000
    expect(await store.consume('stale')).toBeNull()
  })
})

describe('createRedisLikeOAuthStateStore', () => {
  it('saves and consumes via Redis-like KV', async () => {
    const map = new Map<string, string>()
    const redis = {
      async get(key: string) {
        return map.get(key) ?? null
      },
      async set(key: string, value: string) {
        map.set(key, value)
      },
      async del(...keys: string[]) {
        let n = 0
        for (const k of keys) {
          if (map.delete(k)) n += 1
        }
        return n
      },
    }
    let now = 1000
    const store = createRedisLikeOAuthStateStore(redis, { now: () => now })
    await store.save('x', { returnTo: '/a', createdAt: 1000 }, 60)
    expect(await store.consume('x')).toEqual({ returnTo: '/a', createdAt: 1000 })
    expect(await store.consume('x')).toBeNull()

    await store.save('y', { returnTo: '/', createdAt: 1000 }, 1)
    now = 3000
    expect(await store.consume('y')).toBeNull()
  })
})
