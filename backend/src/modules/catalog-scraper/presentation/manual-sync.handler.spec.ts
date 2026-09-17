import { describe, expect, it, vi } from 'vitest'
import { createMemoryCatalogLock } from '../infrastructure/lock/memory-catalog-lock'
import { handleManualSyncRequest } from './manual-sync.handler'

describe('handleManualSyncRequest', () => {
  it('rejects missing bearer token', async () => {
    const res = await handleManualSyncRequest({
      authorizationHeader: undefined,
      expectedToken: 'secret',
      dryRun: false,
      lock: createMemoryCatalogLock(),
      lockKey: 'catalog:lock',
      lockTtlMs: 1000,
      sync: vi.fn(),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 with summary when authorized', async () => {
    const res = await handleManualSyncRequest({
      authorizationHeader: 'Bearer secret',
      expectedToken: 'secret',
      dryRun: true,
      lock: createMemoryCatalogLock(),
      lockKey: 'catalog:lock',
      lockTtlMs: 1000,
      sync: vi.fn(async () => ({
        coursesFound: 1,
        courseParseErrors: 0,
        pathsFound: 0,
        warnings: [],
        diff: {
          addedCourseIds: [],
          removedCourseIds: [],
          changedCourseIds: [],
          addedPathIds: [],
          removedPathIds: [],
        },
        version: 1,
        persisted: true,
      })),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    })
    expect(res.status).toBe(200)
    expect((res.body as { summary: { persisted: boolean } }).summary.persisted).toBe(
      false,
    )
  })
})
