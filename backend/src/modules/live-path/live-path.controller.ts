import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common'
import type { Request, Response } from 'express'
import { CurrentUserId } from '../identity/presentation/current-user.decorator'
import { SessionAuthGuard } from '../identity/presentation/session-auth.guard'
import { InProcessLivePathBus } from './live-path.bus'
import { startLivePathSse } from './live-path.sse'
import { RedisLivePathState } from './live-path.state'

@Controller()
export class LivePathController {
  constructor(
    private readonly bus: InProcessLivePathBus,
    private readonly state: RedisLivePathState,
  ) {}

  @Get('me/learning-paths/events')
  @UseGuards(SessionAuthGuard)
  async events(
    @CurrentUserId() userId: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await startLivePathSse({
      userId,
      query: request.query as Record<string, unknown>,
      response,
      bus: this.bus,
      state: this.state,
    })
  }
}
