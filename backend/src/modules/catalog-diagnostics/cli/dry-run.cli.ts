/**
 * Dry-run real contra DevTalles: corre un sync completo sin persistir y reporta
 * el resumen. No escribe en Redis. Herramienta de diagnóstico, no parte del API.
 */
import { writeFileSync } from 'node:fs'
import { DEFAULT_SCRAPER_CONFIG } from '../../catalog-scraper/domain/config'
import { createFetchHttpClient } from '../../catalog-scraper/infrastructure/http/fetch-http-client'
import { createInMemoryRedis } from '../../catalog-scraper/infrastructure/redis/in-memory-redis'
import { createRedisCatalogRepository } from '../../catalog-scraper/infrastructure/redis/redis-catalog.repository'
import { createDryRunCatalogRepository } from '../../catalog-scraper/application/dry-run-catalog-repository'
import { syncCatalog } from '../../catalog-scraper/application/sync-catalog'
import { syncCatalogDryRun } from '../../catalog-scraper/application/manual-sync'
import type { HttpFetcher } from '../../catalog-scraper/ports/http-client.port'

const fetcher: HttpFetcher = async (url, init) => {
  const res = await fetch(url, {
    headers: init.headers,
    signal: init.signal,
  })
  const body = await res.text()
  return { status: res.status, body }
}

async function main() {
  const started = Date.now()

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
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
