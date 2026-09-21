import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env.validation'
import { DEFAULT_SCRAPER_CONFIG, type ScraperConfig } from '../domain/config'
import { HTTP_CLIENT } from '../ports/http-client.port'
import { CATALOG_REPOSITORY } from '../ports/catalog-repository.port'
import { CATALOG_LOCK } from '../ports/catalog-lock.port'
import { createFetchHttpClient } from '../infrastructure/http/fetch-http-client'
import {
  createIoredisClient,
  createIoredisRedisLike,
} from '../infrastructure/redis/ioredis-client'
import { createRedisCatalogRepository } from '../infrastructure/redis/redis-catalog.repository'
import { createMemoryCatalogLock } from '../infrastructure/lock/memory-catalog-lock'
import { SCRAPER_CONFIG } from './catalog-scraper.tokens'
import { globalFetchFetcher } from './catalog-scraper.config'
import { CatalogScraperService } from './catalog-scraper.service'
import { CatalogScraperController } from './catalog-scraper.controller'
import { CatalogCronService } from './catalog-cron.service'

/**
 * Catalog scraper Nest wiring. Catalog snapshots persist in Redis via ioredis.
 * Lock remains process-local until a distributed Redis lock is added.
 */
@Module({
  imports: [ConfigModule],
  controllers: [CatalogScraperController],
  providers: [
    { provide: SCRAPER_CONFIG, useValue: DEFAULT_SCRAPER_CONFIG },
    {
      provide: HTTP_CLIENT,
      inject: [SCRAPER_CONFIG],
      useFactory: (config: ScraperConfig) =>
        createFetchHttpClient({
          fetcher: globalFetchFetcher,
          userAgent: config.userAgent,
          timeoutMs: config.timeoutMs,
          maxRetries: config.maxRetries,
          backoffBaseMs: config.backoffBaseMs,
          maxConcurrency: config.maxConcurrency,
          minIntervalMs: config.minIntervalMs,
        }),
    },
    {
      provide: CATALOG_REPOSITORY,
      inject: [SCRAPER_CONFIG, ConfigService],
      useFactory: (config: ScraperConfig, cfg: ConfigService<Env, true>) => {
        const client = createIoredisClient({
          host: cfg.get('REDIS_HOST', { infer: true }),
          port: cfg.get('REDIS_PORT', { infer: true }),
          username: cfg.get('REDIS_USERNAME', { infer: true }) || undefined,
          password: cfg.get('REDIS_PASSWORD', { infer: true }) || undefined,
        })
        return createRedisCatalogRepository(createIoredisRedisLike(client), {
          retainPreviousVersions: config.retainPreviousVersions,
        })
      },
    },
    { provide: CATALOG_LOCK, useFactory: () => createMemoryCatalogLock() },
    CatalogScraperService,
    CatalogCronService,
  ],
  exports: [CatalogScraperService, CATALOG_REPOSITORY],
})
export class CatalogScraperModule {}
