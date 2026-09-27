import { Logger } from '@nestjs/common'
import type { LivePathEvent } from './live-path.types'

export const LIVE_PATH_TTL_SECONDS = 86_400

type LiveRedis = {
  set: (key: string, value: string, mode: 'EX', ttl: number) => Promise<unknown>
  get: (key: string) => Promise<string | null>
}

export class RedisLivePathState {
  private readonly logger = new Logger(RedisLivePathState.name)

  constructor(private readonly redis: LiveRedis) {}

  async save(userId: string, event: LivePathEvent): Promise<void> {
    try {
      await this.redis.set(keyOf(userId), JSON.stringify(event), 'EX', LIVE_PATH_TTL_SECONDS)
    } catch (error) {
      this.logger.warn(
        { event: 'live_path_redis_unavailable', err: error instanceof Error ? error.message : String(error) },
        'Live path state was not stored',
      )
    }
  }

  async read(userId: string): Promise<LivePathEvent | null> {
    try {
      const raw = await this.redis.get(keyOf(userId))
      if (!raw) return null
      return JSON.parse(raw) as LivePathEvent
    } catch (error) {
      this.logger.warn(
        { event: 'live_path_redis_unavailable', err: error instanceof Error ? error.message : String(error) },
        'Live path state was not read',
      )
      return null
    }
  }
}

function keyOf(userId: string): string {
  return `live:path:${userId}`
}
