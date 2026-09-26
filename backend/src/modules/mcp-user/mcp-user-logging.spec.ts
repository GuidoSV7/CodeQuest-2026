import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { McpUserController } from './mcp-user.controller'
import type { McpTokenVerifier } from './mcp-token-verifier'

function response() {
  return {
    headersSent: false,
    statusCode: 0,
    header: '',
    body: undefined as unknown,
    setHeader(name: string, value: string) {
      if (name === 'WWW-Authenticate') this.header = value
    },
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.body = body
      return this
    },
  }
}

describe('MCP user request logs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects a bearer-less call and never writes the query token', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const tokens: McpTokenVerifier = { verifyAccessToken: vi.fn() }
    const controller = new McpUserController(tokens)
    const res = response()
    await controller.handle(
      {
        query: { access_token: 'secret-token' },
        headers: {},
        body: { method: 'tools/call', params: { name: 'get_my_path' } },
      } as unknown as Request,
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(400)
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-token')
    expect(warn.mock.calls[0]?.[0]).toMatchObject({
      event: 'mcp_access_token_query_rejected',
      tool: 'get_my_path',
    })
  })

  it('logs an unauthenticated MCP call', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const controller = new McpUserController({ verifyAccessToken: vi.fn() })
    const res = response()
    await controller.handle(
      { query: {}, headers: {}, body: { method: 'tools/list' } } as unknown as Request,
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(401)
    expect(warn.mock.calls[0]?.[0]).toMatchObject({
      event: 'mcp_unauthenticated',
      rpcMethod: 'tools/list',
    })
  })
})
