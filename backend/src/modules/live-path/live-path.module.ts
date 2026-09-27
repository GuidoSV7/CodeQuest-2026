import { Module, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { IdentityModule } from '../identity/identity.module'
import type { Env } from '../../config/env.validation'
import { livePathPublisher } from './live-path.copy'
import { LivePathController } from './live-path.controller'
import { InProcessLivePathBus } from './live-path.bus'
import { publishLivePath } from './publish-live-path'
import { RedisLivePathState } from './live-path.state'

@Module({
  imports: [IdentityModule],
  controllers: [LivePathController],
  providers: [
    InProcessLivePathBus,
    {
      provide: RedisLivePathState,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const redis = new Redis({
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
          username: config.get('REDIS_USERNAME', { infer: true }) || undefined,
          password: config.get('REDIS_PASSWORD', { infer: true }) || undefined,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
        })
        return new RedisLivePathState(redis)
      },
    },
    {
      provide: 'LIVE_PATH_WIRE',
      inject: [InProcessLivePathBus, RedisLivePathState],
      useFactory: (bus: InProcessLivePathBus, state: RedisLivePathState) => {
        livePathPublisher.publish = (userId, draft) => publishLivePath(bus, state, userId, draft).then(() => undefined)
        return true
      },
    },
  ],
  exports: [InProcessLivePathBus, RedisLivePathState],
})
export class LivePathModule implements OnModuleInit {
  onModuleInit(): void {}
}
