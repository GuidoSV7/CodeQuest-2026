import type { InProcessLivePathBus } from './live-path.bus'
import type { RedisLivePathState } from './live-path.state'
import type { LivePathEvent } from './live-path.types'

const HEARTBEAT_MS = 20_000

type SseResponse = {
  statusCode: number
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => unknown }
  json?: (body: unknown) => unknown
  write: (chunk: string) => boolean
  on: (event: 'close', listener: () => void) => void
}

export async function startLivePathSse(input: {
  userId: string | undefined
  response: SseResponse
  bus: InProcessLivePathBus
  state: RedisLivePathState
  query?: Record<string, unknown>
  heartbeatMs?: number
  now?: () => Date
}): Promise<void> {
  void input.query
  if (!input.userId) {
    input.response.status(401).json({
      statusCode: 401,
      code: 'UnauthorizedException',
      message: 'Missing session',
    })
    return
  }
  const userId = input.userId
  const now = input.now ?? (() => new Date())
  const response = input.response
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  response.setHeader('Cache-Control', 'no-cache, no-transform')
  response.setHeader('Connection', 'keep-alive')
  response.setHeader('X-Accel-Buffering', 'no')
  response.write('retry: 5000\n\n')
  const last = await input.state.read(userId)
  if (last) response.write(formatSse(last))
  const stop = input.bus.subscribe(userId, (event) => {
    response.write(formatSse(event))
  })
  const timer = setInterval(() => {
    response.write(
      `event: heartbeat\ndata: ${JSON.stringify({ type: 'heartbeat', at: now().toISOString() })}\n\n`,
    )
  }, input.heartbeatMs ?? HEARTBEAT_MS)
  response.on('close', () => {
    clearInterval(timer)
    stop()
  })
}

function formatSse(event: LivePathEvent): string {
  return `id: ${event.id}\nevent: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`
}
