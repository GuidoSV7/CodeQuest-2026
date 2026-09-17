import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { resolveCatalogCronConfig } from '../domain/cron-config'
import { CatalogScraperService } from './catalog-scraper.service'

/**
 * Scheduler in-process OPT-IN. Por defecto el modo es `platform`
 * (cron externo → CLI/HTTP), así que acá solo se loguea. Con
 * `CATALOG_CRON_MODE=in-process` + `CATALOG_CRON_IN_PROCESS=true` se registra
 * un CronJob que dispara `runJob()` (con lock, nunca lanza).
 */
@Injectable()
export class CatalogCronService implements OnModuleInit {
  private readonly logger = new Logger(CatalogCronService.name)

  constructor(
    private readonly service: CatalogScraperService,
    private readonly registry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const cron = resolveCatalogCronConfig(process.env)

    if (cron.mode !== 'in-process' || !cron.inProcessEnabled) {
      this.logger.log(
        `Catalog cron en modo "${cron.mode}" (schedule "${cron.schedule}") — scheduler in-process deshabilitado.`,
      )
      return
    }

    const job = new CronJob(cron.schedule, () => {
      void this.service.runJob()
    })
    this.registry.addCronJob('catalog-sync', job as never)
    job.start()
    this.logger.log(`Catalog cron in-process iniciado: "${cron.schedule}"`)
  }
}
