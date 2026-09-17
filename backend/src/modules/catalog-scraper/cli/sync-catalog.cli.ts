#!/usr/bin/env node
/**
 * Manual catalog sync CLI.
 *
 * Usage:
 *   node --import tsx src/modules/catalog-scraper/cli/sync-catalog.cli.ts
 *   npm run catalog:sync
 *   npm run catalog:sync -- --dry-run
 *
 * Intended to be invoked by platform cron / GitHub Actions.
 * Wiring of real HttpClient + Redis happens via env (see README in module).
 *
 * This entrypoint is intentionally thin: production wiring can replace
 * `createDefaultSync` once NestJS DI is bootstrapped.
 */
import { resolveCatalogCronConfig } from '../domain/cron-config'
import { createMemoryCatalogLock } from '../infrastructure/lock/memory-catalog-lock'
import { manualSyncCatalog } from '../application/manual-sync'
import { runCatalogSyncJob } from '../application/run-catalog-sync-job'
import type { SyncSummary } from '../domain/catalog'

export type CliDeps = {
  sync: () => Promise<SyncSummary>
  dryRun: boolean
}

export async function runSyncCli(deps: CliDeps): Promise<number> {
  const cron = resolveCatalogCronConfig()
  const lock = createMemoryCatalogLock()

  const result = await runCatalogSyncJob({
    lock,
    lockKey: cron.lockKey,
    lockTtlMs: cron.lockTtlMs,
    sync: async () =>
      manualSyncCatalog({
        sync: deps.sync,
        dryRun: deps.dryRun,
      }),
    logger: {
      info: (m, meta) => console.log(JSON.stringify({ level: 'info', m, meta })),
      warn: (m, meta) => console.warn(JSON.stringify({ level: 'warn', m, meta })),
      error: (m, meta) =>
        console.error(JSON.stringify({ level: 'error', m, meta })),
    },
  })

  if (result.status === 'ok') {
    console.log(JSON.stringify({ ok: true, summary: result.summary }))
    return 0
  }
  if (result.status === 'skipped') {
    console.warn(JSON.stringify({ ok: false, skipped: true }))
    return 0
  }
  console.error(JSON.stringify({ ok: false, error: result.message }))
  return 1
}

/** Pure argv parser (tested). */
export function parseSyncCliArgs(argv: string[]): { dryRun: boolean } {
  return { dryRun: argv.includes('--dry-run') }
}
