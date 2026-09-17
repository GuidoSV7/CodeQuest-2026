import type { SyncSummary } from '../domain/catalog'
import type { CatalogLock } from '../ports/catalog-lock.port'

export type JobLogger = {
  info: (message: string, meta?: unknown) => void
  warn: (message: string, meta?: unknown) => void
  error: (message: string, meta?: unknown) => void
}

export type SyncJobResult =
  | { status: 'ok'; summary: SyncSummary }
  | { status: 'skipped'; reason: 'locked' }
  | { status: 'error'; message: string }

export type RunCatalogSyncJobDeps = {
  lock: CatalogLock
  lockKey: string
  lockTtlMs: number
  sync: () => Promise<SyncSummary>
  logger: JobLogger
}

/**
 * Scheduled/manual entry: lock → syncCatalog → log.
 * Never throws; failures are returned as `{ status: 'error' }`.
 */
export async function runCatalogSyncJob(
  deps: RunCatalogSyncJobDeps,
): Promise<SyncJobResult> {
  const acquired = await deps.lock.tryAcquire(deps.lockKey, deps.lockTtlMs)
  if (!acquired) {
    deps.logger.warn('catalog sync skipped: lock held', { key: deps.lockKey })
    return { status: 'skipped', reason: 'locked' }
  }

  try {
    const summary = await deps.sync()
    deps.logger.info('catalog sync completed', summary)
    return { status: 'ok', summary }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    deps.logger.error('catalog sync failed', { message })
    return { status: 'error', message }
  } finally {
    await deps.lock.release(deps.lockKey)
  }
}
