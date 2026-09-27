import { afterEach, describe, expect, it, vi } from 'vitest'
import { InProcessLivePathBus } from './live-path.bus'
import { RedisLivePathState } from './live-path.state'
import { startLivePathSse } from './live-path.sse'

class FakeResponse {
  statusCode = 200
  headers: Record<string, string> = {}
  body: unknown
  chunks: string[] = []
  private readonly listeners = new Map<string, () => void>()

  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value
  }

  status(code: number) {
    this.statusCode = code
    return this
  }

  json(body: unknown) {
    this.body = body
    return this
  }

  write(chunk: string) {
    this.chunks.push(chunk)
    return true
  }

  on(event: string, listener: () => void) {
    this.listeners.set(event, listener)
  }

  close() {
    this.listeners.get('close')?.()
  }
}

const stored = {
  id: 7,
  event: 'path.generated' as const,
  data: { type: 'path.generated', strategy: 'official_path', source_path_id: 'programas-react', items: [] },
}

describe('live path SSE', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects a missing session with 401 and does not open the stream', async () => {
    const response = new FakeResponse()
    await startLivePathSse({
      userId: undefined,
      response,
      bus: new InProcessLivePathBus(),
      state: new RedisLivePathState({ set: vi.fn(), get: vi.fn() }),
    })
    expect(response.statusCode).toBe(401)
    expect(response.body).toMatchObject({ message: 'Missing session' })
    expect(response.chunks.join('')).not.toContain('text/event-stream')
    expect(response.headers['content-type']).toBeUndefined()
  })

  it('sends the stored path, then only that user events, with the spec headers and a heartbeat', async () => {
    vi.useFakeTimers()
    const bus = new InProcessLivePathBus()
    const response = new FakeResponse()
    await startLivePathSse({
      userId: 'ada',
      query: { user_id: 'bea' },
      response,
      bus,
      heartbeatMs: 20_000,
      now: () => new Date('2026-09-27T00:20:00.000Z'),
      state: new RedisLivePathState({
        set: vi.fn(async () => 'OK'),
        get: async (key: string) => (key === 'live:path:ada' ? JSON.stringify(stored) : null),
      }),
    })
    const opening = response.chunks.join('')
    expect(response.headers['content-type']).toBe('text/event-stream; charset=utf-8')
    expect(response.headers['cache-control']).toBe('no-cache, no-transform')
    expect(response.headers['x-accel-buffering']).toBe('no')
    expect(opening.startsWith('retry: 5000\n\n')).toBe(true)
    expect(opening).toContain('event: path.generated')
    expect(opening).toContain('"source_path_id":"programas-react"')
    bus.publish('bea', { event: 'path.saved', data: { type: 'path.saved', path_id: 'foreign' } })
    expect(response.chunks.join('')).not.toContain('foreign')
    bus.publish('ada', { event: 'progress.updated', data: { type: 'progress.updated', course_id: '3395229', status: 'completed' } })
    expect(response.chunks.join('')).toContain('"course_id":"3395229"')
    await vi.advanceTimersByTimeAsync(20_000)
    expect(response.chunks.join('')).toContain('event: heartbeat')
    expect(response.chunks.join('')).toContain('"at":"2026-09-27T00:20:00.000Z"')
    response.close()
    expect(bus.subscriberCount('ada')).toBe(0)
  })
})
