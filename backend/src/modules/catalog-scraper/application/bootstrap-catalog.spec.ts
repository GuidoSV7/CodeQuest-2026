import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { CatalogSnapshot, SyncSummary } from '../domain/catalog'
import { createInMemoryRedis } from '../infrastructure/redis/in-memory-redis'
import { createRedisCatalogRepository } from '../infrastructure/redis/redis-catalog.repository'
import type { CatalogRepository } from '../ports/catalog-repository.port'
import type { HttpClient } from '../ports/http-client.port'
import { bootstrapCatalog } from './bootstrap-catalog'
import { createDryRunCatalogRepository } from './dry-run-catalog-repository'
import { runCatalogSyncJob } from './run-catalog-sync-job'
import { manualSyncCatalog, syncCatalogDryRun } from './manual-sync'
import { createMemoryCatalogLock } from '../infrastructure/lock/memory-catalog-lock'
import { importCatalogSeed } from './seed'

const SEED_PATH = path.resolve(
  process.cwd(),
  'src/modules/catalog-scraper/data/catalog.seed.json',
)

function loadSeedJson(): string {
  return readFileSync(SEED_PATH, 'utf8')
}

function emptySummary(overrides: Partial<SyncSummary> = {}): SyncSummary {
  return {
    coursesFound: 1,
    courseParseErrors: 0,
    pathsFound: 0,
    warnings: [],
    diff: {
      addedCourseIds: [1],
      removedCourseIds: [],
      changedCourseIds: [],
      addedPathIds: [],
      removedPathIds: [],
    },
    version: 1,
    persisted: true,
    ...overrides,
  }
}

describe('bootstrapCatalog', () => {
  it('imports seed into Redis when catalog:current is missing', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis)

    const result = await bootstrapCatalog({
      catalogRepository: repo,
      loadSeedJson,
    })

    expect(result.source).toBe('seed-imported')
    expect(result.warnings).toEqual([])
    expect(result.catalog.courses.length).toBeGreaterThanOrEqual(1)
    expect(await repo.getCurrent()).not.toBeNull()
    expect((await repo.getCurrent())?.source).toBe('seed')
  })

  it('does not overwrite Redis when catalog:current already exists', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis)
    await importCatalogSeed(repo, loadSeedJson())
    const before = await repo.getCurrent()

    const save = vi.spyOn(repo, 'save')
    const result = await bootstrapCatalog({
      catalogRepository: repo,
      loadSeedJson,
    })

    expect(result.source).toBe('redis')
    expect(save).not.toHaveBeenCalled()
    expect(result.catalog.version).toBe(before!.version)
  })

  it('uses in-memory seed and warns when Redis is unavailable', async () => {
    const failingRepo: CatalogRepository = {
      async getCurrent() {
        throw new Error('ECONNREFUSED')
      },
      async save() {
        throw new Error('ECONNREFUSED')
      },
    }

    const result = await bootstrapCatalog({
      catalogRepository: failingRepo,
      loadSeedJson,
    })

    expect(result.source).toBe('seed-memory')
    expect(result.warnings.some((w) => /redis/i.test(w))).toBe(true)
    expect(result.catalog.courses.length).toBeGreaterThanOrEqual(1)
    expect(result.catalog.source).toBe('seed')
  })
})

describe('runCatalogSyncJob', () => {
  it('acquires lock, runs sync, and returns summary', async () => {
    const lock = createMemoryCatalogLock()
    const sync = vi.fn(async () => emptySummary({ version: 2 }))

    const result = await runCatalogSyncJob({
      lock,
      lockKey: 'catalog:lock',
      lockTtlMs: 60_000,
      sync,
      logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    })

    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.summary.version).toBe(2)
    }
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('skips when lock is already held', async () => {
    const lock = createMemoryCatalogLock()
    await lock.tryAcquire('catalog:lock', 60_000)
    const sync = vi.fn(async () => emptySummary())

    const result = await runCatalogSyncJob({
      lock,
      lockKey: 'catalog:lock',
      lockTtlMs: 60_000,
      sync,
      logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    })

    expect(result.status).toBe('skipped')
    expect(sync).not.toHaveBeenCalled()
  })

  it('logs error and does not throw when sync fails', async () => {
    const lock = createMemoryCatalogLock()
    const error = vi.fn()
    const sync = vi.fn(async () => {
      throw new Error('boom')
    })

    const result = await runCatalogSyncJob({
      lock,
      lockKey: 'catalog:lock',
      lockTtlMs: 60_000,
      sync,
      logger: { info: vi.fn(), error, warn: vi.fn() },
    })

    expect(result.status).toBe('error')
    expect(error).toHaveBeenCalled()
    // lock released — second run can acquire
    const again = await runCatalogSyncJob({
      lock,
      lockKey: 'catalog:lock',
      lockTtlMs: 60_000,
      sync: vi.fn(async () => emptySummary()),
      logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    })
    expect(again.status).toBe('ok')
  })
})

describe('manualSyncCatalog + dry-run', () => {
  it('manual sync returns summary from syncCatalog', async () => {
    const sync = vi.fn(async () => emptySummary({ version: 5 }))
    const summary = await manualSyncCatalog({ sync, dryRun: false })
    expect(summary.version).toBe(5)
    expect(summary.persisted).toBe(true)
    expect(sync).toHaveBeenCalled()
  })

  it('dry-run runs sync against non-persisting repo and reports persisted=false with diff', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis)
    await importCatalogSeed(repo, loadSeedJson())
    const before = await repo.getCurrent()

    const http: HttpClient = {
      async getText() {
        throw new Error('network should be mocked at sync layer')
      },
    }

    // Inject sync that uses dry-run repo wrapper
    const innerSave = vi.spyOn(repo, 'save')
    const dryRepo = createDryRunCatalogRepository(repo)

    const fakeSync = async () => {
      // simulate orchestrator calling save on dry repo
      const draft: CatalogSnapshot = {
        ...before!,
        source: 'scraper',
        courses: [
          ...before!.courses,
          {
            ...before!.courses[0]!,
            id: 999,
            slug: 'new-course',
            title: 'New',
            sourceUrl: 'https://cursos.devtalles.com/courses/new-course',
          },
        ],
        stats: {
          ...before!.stats,
          courseCount: before!.courses.length + 1,
        },
      }
      const saved = await dryRepo.save(draft)
      return emptySummary({
        version: saved.version,
        persisted: true,
        diff: {
          addedCourseIds: [999],
          removedCourseIds: [],
          changedCourseIds: [],
          addedPathIds: [],
          removedPathIds: [],
        },
      })
    }

    const summary = await syncCatalogDryRun({ sync: fakeSync })
    expect(summary.persisted).toBe(false)
    expect(summary.diff.addedCourseIds).toContain(999)
    expect(innerSave).not.toHaveBeenCalled()
    expect(await repo.getCurrent()).toEqual(before)
    void http
  })
})
