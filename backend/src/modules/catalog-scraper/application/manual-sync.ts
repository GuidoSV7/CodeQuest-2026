import type { SyncSummary } from '../domain/catalog'

export type ManualSyncDeps = {
  sync: () => Promise<SyncSummary>
  dryRun: boolean
}

/** Manual trigger (CLI / HTTP handler). Dry-run forces persisted=false. */
export async function manualSyncCatalog(
  deps: ManualSyncDeps,
): Promise<SyncSummary> {
  const summary = await deps.sync()
  if (deps.dryRun) {
    return { ...summary, persisted: false }
  }
  return summary
}

export type DryRunSyncDeps = {
  sync: () => Promise<SyncSummary>
}

export async function syncCatalogDryRun(
  deps: DryRunSyncDeps,
): Promise<SyncSummary> {
  return manualSyncCatalog({ sync: deps.sync, dryRun: true })
}
