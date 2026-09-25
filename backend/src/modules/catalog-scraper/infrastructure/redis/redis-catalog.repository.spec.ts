import { describe, expect, it } from 'vitest'
import type { CatalogSnapshot } from '../../domain/catalog'
import { createInMemoryRedis } from './in-memory-redis'
import { createRedisCatalogRepository } from './redis-catalog.repository'
import { REDIS_KEYS } from '../../ports/catalog-repository.port'

function sampleCatalog(version: number, courseIds: number[]): CatalogSnapshot {
  return {
    version,
    generatedAt: '2026-09-16T00:00:00.000Z',
    source: 'scraper',
    courses: courseIds.map((id) => ({
      id,
      slug: `course-${id}`,
      title: `Course ${id}`,
      subtitleLabel: null,
      metaDescription: null,
      description: null,
      coverImageUrl: null,
      previewYoutubeId: null,
      price: { amount: 0, currency: 'USD' },
      lessonCount: 1,
      videoHours: 1,
      instructor: 'x',
      hasSubtitles: false,
      prerequisites: [],
      sections: [],
      relatedCourses: [],
      learningPathUrl: null,
      sourceUrl: `https://cursos.devtalles.com/courses/course-${id}`,
      categories: ['all'],
      scrapedAt: '2026-09-16T00:00:00.000Z',
      relatedCourseIds: [],
      status: 'ok',
    })),
    paths: [],
    stats: {
      courseCount: courseIds.length,
      pathCount: 0,
      categoryCounts: {
        all: courseIds.length,
        wip: 0,
        free: 0,
        mini: 0,
        exclusive: 0,
        legacy: 0,
      },
    },
  }
}

describe('RedisCatalogRepository', () => {
  it('getCurrentVersion reads only the pointer key', async () => {
    const redis = createInMemoryRedis()
    const gets: string[] = []
    const wrapped = {
      ...redis,
      async get(key: string) {
        gets.push(key)
        return redis.get(key)
      },
    }
    const repo = createRedisCatalogRepository(wrapped)
    await repo.save(sampleCatalog(0, [1]))
    gets.length = 0
    await expect(repo.getCurrentVersion()).resolves.toBe('v1')
    expect(gets).toEqual([REDIS_KEYS.current])
  })

  it('getCurrent returns null when empty', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis)
    await expect(repo.getCurrent()).resolves.toBeNull()
  })

  it('save writes catalog:v{n+1} then updates catalog:current atomically', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis, { retainPreviousVersions: 1 })

    const saved1 = await repo.save(sampleCatalog(0, [1, 2]))
    expect(saved1.version).toBe(1)
    expect(await redis.get(REDIS_KEYS.current)).toBe('v1')
    expect(await redis.get(REDIS_KEYS.version(1))).toContain('"version":1')

    const current = await repo.getCurrent()
    expect(current?.version).toBe(1)
    expect(current?.courses.map((c) => c.id)).toEqual([1, 2])

    const saved2 = await repo.save(sampleCatalog(0, [1, 2, 3]))
    expect(saved2.version).toBe(2)
    expect(await redis.get(REDIS_KEYS.current)).toBe('v2')
    expect(await redis.get(REDIS_KEYS.previous)).toBe('v1')
    // retention: v1 still present as previous
    expect(await redis.get(REDIS_KEYS.version(1))).toBeTruthy()
  })

  it('retains only the configured number of previous versions', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis, { retainPreviousVersions: 1 })

    await repo.save(sampleCatalog(0, [1]))
    await repo.save(sampleCatalog(0, [1, 2]))
    await repo.save(sampleCatalog(0, [1, 2, 3]))

    expect(await redis.get(REDIS_KEYS.current)).toBe('v3')
    expect(await redis.get(REDIS_KEYS.previous)).toBe('v2')
    expect(await redis.get(REDIS_KEYS.version(3))).toBeTruthy()
    expect(await redis.get(REDIS_KEYS.version(2))).toBeTruthy()
    expect(await redis.get(REDIS_KEYS.version(1))).toBeNull()
  })

  it('does not move catalog:current if version payload write fails', async () => {
    const redis = createInMemoryRedis()
    const failing = {
      ...redis,
      async set(key: string, value: string) {
        if (key.startsWith('catalog:v')) {
          throw new Error('disk full')
        }
        return redis.set(key, value)
      },
    }
    const repo = createRedisCatalogRepository(failing)

    await expect(repo.save(sampleCatalog(0, [1]))).rejects.toThrow(/disk full/)
    expect(await redis.get(REDIS_KEYS.current)).toBeNull()
  })

  it('keeps previous current if pointer update fails after version write', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis)
    await repo.save(sampleCatalog(0, [1]))

    const flaky = {
      get: redis.get.bind(redis),
      del: redis.del.bind(redis),
      async set(key: string, value: string) {
        if (key === REDIS_KEYS.current) {
          const v2 = await redis.get(REDIS_KEYS.version(2))
          if (v2) throw new Error('pointer fail')
        }
        return redis.set(key, value)
      },
      async multiSet(entries: Array<[string, string]>) {
        for (const [k, v] of entries) {
          await flaky.set(k, v)
        }
      },
    }

    const flakyRepo = createRedisCatalogRepository(flaky)
    await expect(flakyRepo.save(sampleCatalog(0, [1, 2]))).rejects.toThrow(
      /pointer fail/,
    )
    expect(await redis.get(REDIS_KEYS.current)).toBe('v1')
    expect(await redis.get(REDIS_KEYS.version(2))).toBeTruthy()
  })
})
