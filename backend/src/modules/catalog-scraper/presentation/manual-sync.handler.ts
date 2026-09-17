import type { SyncSummary } from '../domain/catalog'
import {
  runCatalogSyncJob,
  type JobLogger,
} from '../application/run-catalog-sync-job'
import { manualSyncCatalog } from '../application/manual-sync'
import type { CatalogLock } from '../ports/catalog-lock.port'

/**
 * HTTP-ready handler for a protected manual sync endpoint.
 * NestJS controller can delegate here once the app module exists.
 */
export async function handleManualSyncRequest(input: {
  authorizationHeader: string | undefined
  expectedToken: string
  dryRun: boolean
  lock: CatalogLock
  lockKey: string
  lockTtlMs: number
  sync: () => Promise<SyncSummary>
  logger: JobLogger
}): Promise<{ status: number; body: unknown }> {
  const token = input.authorizationHeader?.replace(/^Bearer\s+/i, '')
  if (!token || token !== input.expectedToken) {
    return { status: 401, body: { error: 'unauthorized' } }
  }

  const result = await runCatalogSyncJob({
    lock: input.lock,
    lockKey: input.lockKey,
    lockTtlMs: input.lockTtlMs,
    sync: () =>
      manualSyncCatalog({ sync: input.sync, dryRun: input.dryRun }),
    logger: input.logger,
  })

  if (result.status === 'ok') {
    return { status: 200, body: { ok: true, summary: result.summary } }
  }
  if (result.status === 'skipped') {
    return { status: 409, body: { ok: false, skipped: true } }
  }
  return { status: 500, body: { ok: false, error: result.message } }
}
