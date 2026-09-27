import type { InProcessLivePathBus } from './live-path.bus'
import type { RedisLivePathState } from './live-path.state'
import type { LivePathDraft, LivePathEvent } from './live-path.types'

export async function publishLivePath(
  bus: InProcessLivePathBus,
  state: RedisLivePathState,
  userId: string,
  draft: LivePathDraft,
): Promise<LivePathEvent> {
  const event = bus.publish(userId, draft)
  await state.save(userId, event)
  return event
}
