import Redis from 'ioredis'
import type { RedisLike } from './in-memory-redis'

export type RedisConnectionOptions = {
  host: string
  port: number
  username?: string
  password?: string
}

/** Creates a connected ioredis client from env-style options. */
export function createIoredisClient(options: RedisConnectionOptions): Redis {
  return new Redis({
    host: options.host,
    port: options.port,
    username: options.username || undefined,
    password: options.password || undefined,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  })
}

/** Adapts ioredis to the RedisLike port used by CatalogRepository. */
export function createIoredisRedisLike(client: Redis): RedisLike {
  return {
    async get(key) {
      return client.get(key)
    },
    async set(key, value) {
      await client.set(key, value)
    },
    async del(...keys) {
      if (keys.length === 0) return 0
      return client.del(...keys)
    },
    async multiSet(entries) {
      if (entries.length === 0) return
      const pipeline = client.pipeline()
      for (const [key, value] of entries) {
        pipeline.set(key, value)
      }
      await pipeline.exec()
    },
  }
}

export function redisOptionsFromEnv(
  env: Record<string, string | undefined> = process.env,
): RedisConnectionOptions {
  return {
    host: env.REDIS_HOST?.trim() || 'localhost',
    port: Number(env.REDIS_PORT ?? 6379) || 6379,
    username: env.REDIS_USERNAME?.trim() || undefined,
    password: env.REDIS_PASSWORD ?? undefined,
  }
}
