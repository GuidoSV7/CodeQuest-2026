import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocketServer } from 'ws'
import type { SessionJwt } from '../identity/infrastructure/session-jwt'
import { LearningPathEventHub } from './learning-path-event.hub'

const LIVE_PATH = '/api/me/learning-paths/live'

type UpgradeServer = {
  on(
    event: 'upgrade',
    listener: (request: IncomingMessage, socket: Duplex, head: Buffer) => void,
  ): void
}

export function attachLearningPathSocket(options: {
  server: UpgradeServer
  hub: LearningPathEventHub
  sessionJwt: SessionJwt
  cookieName: string
}): void {
  const sockets = new WebSocketServer({ noServer: true })
  options.server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    if (pathname !== LIVE_PATH) return
    void accept(options, sockets, request, socket, head)
  })
}

async function accept(
  options: {
    hub: LearningPathEventHub
    sessionJwt: SessionJwt
    cookieName: string
  },
  sockets: WebSocketServer,
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): Promise<void> {
  const userId = await userFromCookie(request, options.sessionJwt, options.cookieName)
  if (!userId) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
    socket.destroy()
    return
  }
  sockets.handleUpgrade(request, socket, head, (client) => {
    const unsubscribe = options.hub.subscribe(userId, {
      send: (data) => client.send(data),
    })
    client.on('close', unsubscribe)
  })
}

async function userFromCookie(
  request: IncomingMessage,
  sessionJwt: SessionJwt,
  cookieName: string,
): Promise<string> {
  const header = request.headers.cookie ?? ''
  const token = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)
  if (!token) return ''
  try {
    const claims = await sessionJwt.verify(decodeURIComponent(token))
    return claims.sub
  } catch {
    return ''
  }
}
