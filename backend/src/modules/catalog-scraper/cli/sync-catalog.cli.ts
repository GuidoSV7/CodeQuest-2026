#!/usr/bin/env node
/**
 * Manual catalog sync CLI.
 *
 * Usage:
 *   npm run catalog:sync
 *   npm run catalog:sync -- --dry-run
 *
 * Intended for platform cron / manual ops. Uses REDIS_* from `.env`.
 */
import { config as loadDotenv } from 'dotenv'
import { resolveCatalogCronConfig } from '../domain/cron-config'
import { DEFAULT_SCRAPER_CONFIG } from '../domain/config'
import { createMemoryCatalogLock } from '../infrastructure/lock/memory-catalog-lock'
import { createFetchHttpClient } from '../infrastructure/http/fetch-http-client'
import {
  createIoredisClient,
  createIoredisRedisLike,
  redisOptionsFromEnv,
} from '../infrastructure/redis/ioredis-client'
import { createRedisCatalogRepository } from '../infrastructure/redis/redis-catalog.repository'
import { createDryRunCatalogRepository } from '../application/dry-run-catalog-repository'
import { syncCatalog } from '../application/sync-catalog'
import { manualSyncCatalog } from '../application/manual-sync'
import { runCatalogSyncJob } from '../application/run-catalog-sync-job'
import type { SyncSummary } from '../domain/catalog'
import type { HttpFetcher } from '../ports/http-client.port'

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

const fetcher: HttpFetcher = async (url, init) => {
  const res = await fetch(url, {
    headers: init.headers,
    signal: init.signal,
  })
  const body = await res.text()
  return { status: res.status, body }
}

async function main(): Promise<void> {
  loadDotenv()
  const { dryRun } = parseSyncCliArgs(process.argv.slice(2))
  const config = { ...DEFAULT_SCRAPER_CONFIG }

  const http = createFetchHttpClient({
    fetcher,
    userAgent: config.userAgent,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    backoffBaseMs: config.backoffBaseMs,
    maxConcurrency: config.maxConcurrency,
    minIntervalMs: config.minIntervalMs,
  })

  const redisClient = createIoredisClient(redisOptionsFromEnv())
  const redis = createIoredisRedisLike(redisClient)
  const liveRepo = createRedisCatalogRepository(redis, {
    retainPreviousVersions: config.retainPreviousVersions,
  })
  const catalogRepository = dryRun
    ? createDryRunCatalogRepository(liveRepo)
    : liveRepo

  try {
    const code = await runSyncCli({
      dryRun,
      sync: () => syncCatalog({ http, catalogRepository, config }),
    })
    process.exitCode = code
  } finally {
    redisClient.disconnect()
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
