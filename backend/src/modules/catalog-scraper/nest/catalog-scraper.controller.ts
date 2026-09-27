import { BadRequestException, Controller, Get, Headers, NotFoundException, Param, Post, Query, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import { CatalogScraperService } from './catalog-scraper.service'

@Controller('catalog')
export class CatalogScraperController {
  constructor(
    private readonly service: CatalogScraperService,
    private readonly config: ConfigService,
  ) {}

  @Get('radar')
  async radar() {
    return { technologies: await this.service.getRadarTechnologies() }
  }

  @Get('courses/:courseId')
  async course(@Param('courseId') courseId: string) {
    if (!/^\d{1,12}$/.test(courseId)) {
      throw new BadRequestException('courseId must be numeric')
    }
    const course = await this.service.getCourseCard(courseId)
    if (!course) throw new NotFoundException('Course was not found')
    return { course }
  }

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
