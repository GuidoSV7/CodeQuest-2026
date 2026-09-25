import type { NextFunction, Request, Response } from 'express'
import { MAX_MCP_BODY_BYTES, MCP_RATE_LIMIT, MCP_RATE_WINDOW_MS } from './mcp-limits'

const hits = (() => {
  const slot = globalThis as typeof globalThis & { __codequestMcpHits?: Map<string, number[]> }
  slot.__codequestMcpHits ??= new Map()
  return slot.__codequestMcpHits
})()

export function resetMcpRateLimit(): void {
  hits.clear()
}

export function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown'
}

export function consumeMcpRateLimit(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((ts) => now - ts < MCP_RATE_WINDOW_MS)
  if (recent.length >= MCP_RATE_LIMIT) {
    hits.set(ip, recent)
    return false
  }
  recent.push(now)
  hits.set(ip, recent)
  return true
}

const RPC_ERROR = {
  jsonrpc: '2.0' as const,
  id: null,
  error: { code: -32000, message: '' },
}

function mcpPath(req: Request): boolean {
  const pathName = (req.originalUrl || req.url || '').split('?')[0]
  return pathName === '/mcp'
}

export function applyMcpCors(res: Response): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
  )
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id')
}

export function mountMcpHttpGuards(server: {
  use: (handler: (req: Request, res: Response, next: NextFunction) => void) => void
}): void {
  server.use((req, res, next) => {
    if (!mcpPath(req)) {
      next()
      return
    }
    applyMcpCors(res)
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }
    const length = Number(req.headers['content-length'] ?? 0)
    if (Number.isFinite(length) && length > MAX_MCP_BODY_BYTES) {
      res.status(413).json({
        ...RPC_ERROR,
        error: { code: -32000, message: 'payload_too_large' },
      })
      return
    }
    if (!consumeMcpRateLimit(clientIp(req))) {
      res.status(429).json({
        ...RPC_ERROR,
        error: { code: -32000, message: 'rate_limited' },
      })
      return
    }
    next()
  })
}
