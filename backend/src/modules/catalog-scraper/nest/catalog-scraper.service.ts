import { Inject, Injectable, Logger } from '@nestjs/common'
import type { SyncSummary } from '../domain/catalog'
import type { ScraperConfig } from '../domain/config'
import { resolveCatalogCronConfig } from '../domain/cron-config'
import { toCourseCard } from '../application/course-card'
import { radarTechnologies } from '../application/radar-technologies'
import { syncCatalog } from '../application/sync-catalog'
import { manualSyncCatalog } from '../application/manual-sync'
import {
  runCatalogSyncJob,
  type JobLogger,
  type SyncJobResult,
} from '../application/run-catalog-sync-job'
import { handleManualSyncRequest } from '../presentation/manual-sync.handler'
import { HTTP_CLIENT, type HttpClient } from '../ports/http-client.port'
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from '../ports/catalog-repository.port'
import { CATALOG_LOCK, type CatalogLock } from '../ports/catalog-lock.port'
import { SCRAPER_CONFIG } from './catalog-scraper.tokens'

/**
 * Fachada NestJS del catalog-scraper: inyecta los ports (Symbols) y compone
 * los use-cases funcionales del módulo. La lógica vive en application/; acá
 * solo se cablea DI + logging de NestJS.
 */
@Injectable()
export class CatalogScraperService {
  private readonly logger = new Logger(CatalogScraperService.name)

  private readonly jobLogger: JobLogger = {
    info: (m, meta) => this.logger.log(this.fmt(m, meta)),
    warn: (m, meta) => this.logger.warn(this.fmt(m, meta)),
    error: (m, meta) => this.logger.error(this.fmt(m, meta)),
  }

  constructor(
    @Inject(HTTP_CLIENT) private readonly http: HttpClient,
    @Inject(CATALOG_REPOSITORY) private readonly repo: CatalogRepository,
    @Inject(CATALOG_LOCK) private readonly lock: CatalogLock,
    @Inject(SCRAPER_CONFIG) private readonly config: ScraperConfig,
  ) {}

  private fmt(message: string, meta?: unknown): string {
    return meta ? `${message} ${JSON.stringify(meta)}` : message
  }

  private readonly runSync = (): Promise<SyncSummary> =>
    syncCatalog({ http: this.http, catalogRepository: this.repo, config: this.config })

  /** Disparo manual directo (CLI). `dryRun` fuerza `persisted=false`. */
  manualSync(dryRun = false): Promise<SyncSummary> {
    return manualSyncCatalog({ sync: this.runSync, dryRun })
  }

  /** Job con lock (cron/manual). Nunca lanza; devuelve el resultado. */
  runJob(): Promise<SyncJobResult> {
    const cron = resolveCatalogCronConfig(process.env)
    return runCatalogSyncJob({
      lock: this.lock,
      lockKey: cron.lockKey,
      lockTtlMs: cron.lockTtlMs,
      sync: this.runSync,
      logger: this.jobLogger,
    })
  }

  async getRadarTechnologies(): Promise<string[]> {
    const snapshot = await this.repo.getCurrent()
    if (!snapshot) return []
    return radarTechnologies(snapshot)
  }

  async getCourseCard(courseId: string) {
    const snapshot = await this.repo.getCurrent()
    if (!snapshot) return null
    return toCourseCard(snapshot, courseId)
  }

  /** Endpoint HTTP protegido: valida token + corre el job. Devuelve {status, body}. */
  httpManualSync(
    authorizationHeader: string | undefined,
    dryRun: boolean,
    expectedToken: string,
  ): Promise<{ status: number; body: unknown }> {
    const cron = resolveCatalogCronConfig(process.env)
    return handleManualSyncRequest({
      authorizationHeader,
      expectedToken,
      dryRun,
      lock: this.lock,
      lockKey: cron.lockKey,
      lockTtlMs: cron.lockTtlMs,
      sync: this.runSync,
      logger: this.jobLogger,
    })
  }
}
