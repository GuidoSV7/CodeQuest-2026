import { Controller, Headers, Post, Query, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import { CatalogScraperService } from './catalog-scraper.service'

@Controller('catalog')
export class CatalogScraperController {
  constructor(
    private readonly service: CatalogScraperService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Sync manual protegido. Requiere `Authorization: Bearer <CATALOG_SYNC_TOKEN>`.
   * `?dryRun=true` no persiste. Pensado para cron de plataforma / trigger manual.
   */
  @Post('sync')
  async sync(
    @Headers('authorization') authorization: string | undefined,
    @Query('dryRun') dryRun: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    const expectedToken = this.config.get<string>('CATALOG_SYNC_TOKEN') ?? ''
    const { status, body } = await this.service.httpManualSync(
      authorization,
      dryRun === 'true',
      expectedToken,
    )
    res.status(status)
    return body
  }
}
