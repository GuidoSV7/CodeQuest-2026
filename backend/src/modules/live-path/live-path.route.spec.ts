import { Controller, Get, Module, Param, ParseUUIDPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

@Controller('me/learning-paths')
class PathByIdController {
  @Get(':pathId')
  get(@Param('pathId', ParseUUIDPipe) pathId: string) {
    return { pathId }
  }
}

@Controller()
class EventsController {
  @Get('me/learning-paths/events')
  events() {
    return { stream: true }
  }
}

@Module({ controllers: [PathByIdController] })
class PathsFirstModule {}

@Module({ controllers: [EventsController] })
class EventsModule {}

describe('GET /api/me/learning-paths/events', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [EventsModule, PathsFirstModule],
    }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    await app.listen(0)
  })

  afterAll(async () => {
    await app.close()
  })

  it('is the SSE route, not the path id param', async () => {
    const address = app.getHttpServer().address()
    const port = typeof address === 'object' && address ? address.port : 0
    const response = await fetch(`http://127.0.0.1:${port}/api/me/learning-paths/events`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ stream: true })
  })
})
