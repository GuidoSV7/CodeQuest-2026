import { describe, expect, it, vi } from 'vitest'
import { InProcessLivePathBus } from './live-path.bus'
import { LIVE_PATH_TTL_SECONDS, RedisLivePathState } from './live-path.state'
import { publishLivePath } from './publish-live-path'

const event = {
  event: 'path.generated' as const,
  data: { type: 'path.generated', strategy: 'catalog_search', items: [] },
}

describe('in-process live path bus', () => {
  it('delivers a published event only to that user', () => {
    const bus = new InProcessLivePathBus()
    const own: string[] = []
    const other: string[] = []
    bus.subscribe('ada', (item) => own.push(item.event))
    bus.subscribe('bea', (item) => other.push(item.event))
    bus.publish('ada', event)
    expect(own).toEqual(['path.generated'])
    expect(other).toEqual([])
  })

  it('stops delivering after unsubscribe', () => {
    const bus = new InProcessLivePathBus()
    const seen: number[] = []
    const stop = bus.subscribe('ada', () => seen.push(1))
    stop()
    bus.publish('ada', event)
    expect(seen).toEqual([])
    expect(bus.subscriberCount('ada')).toBe(0)
  })
})

describe('last live path state', () => {
  it('stores the event with a 24 hour TTL', async () => {
    const set = vi.fn(async () => 'OK')
    const state = new RedisLivePathState({ set, get: vi.fn() })
    const saved = { id: 3, ...event }
    await state.save('ada', saved)
    expect(set).toHaveBeenCalledWith('live:path:ada', JSON.stringify(saved), 'EX', LIVE_PATH_TTL_SECONDS)
    expect(LIVE_PATH_TTL_SECONDS).toBe(86_400)
  })

  it('still publishes when Redis throws', async () => {
    const bus = new InProcessLivePathBus()
    const seen: string[] = []
    bus.subscribe('ada', (item) => seen.push(item.event))
    const state = new RedisLivePathState({
      set: async () => {
        throw new Error('redis down')
      },
      get: vi.fn(),
    })
    await publishLivePath(bus, state, 'ada', event)
    expect(seen).toEqual(['path.generated'])
  })
})
