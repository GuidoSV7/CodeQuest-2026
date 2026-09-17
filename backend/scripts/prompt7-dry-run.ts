/**
 * One-shot real dry-run against DevTalles (PROMPT 7). Ephemeral.
 */
import { writeFileSync } from 'node:fs'
import { DEFAULT_SCRAPER_CONFIG } from '../src/modules/catalog-scraper/domain/config.ts'
import { createFetchHttpClient } from '../src/modules/catalog-scraper/infrastructure/http/fetch-http-client.ts'
import { createInMemoryRedis } from '../src/modules/catalog-scraper/infrastructure/redis/in-memory-redis.ts'
import { createRedisCatalogRepository } from '../src/modules/catalog-scraper/infrastructure/redis/redis-catalog.repository.ts'
import { createDryRunCatalogRepository } from '../src/modules/catalog-scraper/application/dry-run-catalog-repository.ts'
import { syncCatalog } from '../src/modules/catalog-scraper/application/sync-catalog.ts'
import { syncCatalogDryRun } from '../src/modules/catalog-scraper/application/manual-sync.ts'
import type { HttpFetcher } from '../src/modules/catalog-scraper/ports/http-client.port.ts'

const started = Date.now()

const fetcher: HttpFetcher = async (url, init) => {
  const res = await fetch(url, {
    headers: init.headers,
    signal: init.signal,
  })
  const body = await res.text()
  return { status: res.status, body }
}

const http = createFetchHttpClient({
  fetcher,
  userAgent: DEFAULT_SCRAPER_CONFIG.userAgent,
  timeoutMs: DEFAULT_SCRAPER_CONFIG.timeoutMs,
  maxRetries: DEFAULT_SCRAPER_CONFIG.maxRetries,
  backoffBaseMs: DEFAULT_SCRAPER_CONFIG.backoffBaseMs,
  maxConcurrency: DEFAULT_SCRAPER_CONFIG.maxConcurrency,
  minIntervalMs: DEFAULT_SCRAPER_CONFIG.minIntervalMs,
})

const redis = createInMemoryRedis()
const repo = createRedisCatalogRepository(redis)
const dryRepo = createDryRunCatalogRepository(repo)

const summary = await syncCatalogDryRun({
  sync: () =>
    syncCatalog({
      http,
      catalogRepository: dryRepo,
      config: { ...DEFAULT_SCRAPER_CONFIG },
    }),
})

const report = {
  mode: 'dry-run' as const,
  elapsedMs: Date.now() - started,
  summary,
  redisStillEmpty: (await repo.getCurrent()) === null,
}

writeFileSync(
  '/tmp/devtalles-dry-run-report.json',
  JSON.stringify(report, null, 2),
)
console.log(JSON.stringify(report, null, 2))
