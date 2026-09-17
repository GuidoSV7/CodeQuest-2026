import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DEFAULT_SCRAPER_CONFIG, type ScraperConfig } from '../domain/config'
import { HTTP_CLIENT } from '../ports/http-client.port'
import { CATALOG_REPOSITORY } from '../ports/catalog-repository.port'
import { CATALOG_LOCK } from '../ports/catalog-lock.port'
import { createFetchHttpClient } from '../infrastructure/http/fetch-http-client'
import { createInMemoryRedis } from '../infrastructure/redis/in-memory-redis'
import { createRedisCatalogRepository } from '../infrastructure/redis/redis-catalog.repository'
import { createMemoryCatalogLock } from '../infrastructure/lock/memory-catalog-lock'
import { SCRAPER_CONFIG } from './catalog-scraper.tokens'
import { globalFetchFetcher } from './catalog-scraper.config'
import { CatalogScraperService } from './catalog-scraper.service'
import { CatalogScraperController } from './catalog-scraper.controller'
import { CatalogCronService } from './catalog-cron.service'

/**
 * Cablea el catalog-scraper (código funcional en domain/application/...) a la
 * DI de NestJS. Los adapters por defecto son livianos (in-memory Redis y lock
 * de proceso) para arrancar sin infra externa.
 *
 * TODO producción: reemplazar CATALOG_REPOSITORY por un adapter de Redis real
 * (o TypeORM) y CATALOG_LOCK por un lock distribuido.
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
      inject: [SCRAPER_CONFIG],
      useFactory: (config: ScraperConfig) =>
        createRedisCatalogRepository(createInMemoryRedis(), {
          retainPreviousVersions: config.retainPreviousVersions,
        }),
    },
    { provide: CATALOG_LOCK, useFactory: () => createMemoryCatalogLock() },
    CatalogScraperService,
    CatalogCronService,
  ],
  exports: [CatalogScraperService],
})
export class CatalogScraperModule {}
