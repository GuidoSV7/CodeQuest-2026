/** Minimal Redis-like key/value store for tests and local doubles. */
export type RedisLike = {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  del(...keys: string[]): Promise<number>
  multiSet(entries: Array<[string, string]>): Promise<void>
}

export function createInMemoryRedis(): RedisLike {
  const store = new Map<string, string>()

  return {
    async get(key) {
      return store.has(key) ? store.get(key)! : null
    },
    async set(key, value) {
      store.set(key, value)
    },
    async del(...keys) {
      let n = 0
      for (const k of keys) {
        if (store.delete(k)) n += 1
      }
      return n
    },
    async multiSet(entries) {
      for (const [k, v] of entries) {
        store.set(k, v)
      }
    },
  }
}
