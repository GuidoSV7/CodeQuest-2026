import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Express } from 'express'
import { RequestMethod, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { McpUserModule } from './mcp-user.module'
import { MCP_CONSENT_USER, type ConsentUser } from './mount-mcp-authorization'
import { unauthenticatedChallenge } from './mcp-oauth.metadata'
import { createSessionJwt } from '../identity/infrastructure/session-jwt'

describe('MCP user transport security', () => {
  let app: INestApplication
  let baseUrl: string
  let sessionCookie = ''

  beforeAll(async () => {
    const sessions = createSessionJwt({ secret: 'test-session-secret-32-characters' })
    const token = await sessions.sign({ userId: '11111111-1111-4111-8111-111111111111', displayName: 'Ada' })
    sessionCookie = `cq_session=${token}`
    const moduleRef = await Test.createTestingModule({ imports: [McpUserModule] })
      .overrideProvider(MCP_CONSENT_USER)
      .useValue((async (req) => {
        const cookie = req.headers.cookie ?? ''
        const match = /(?:^|;\s*)cq_session=([^;]+)/.exec(cookie)
        if (!match?.[1]) return ''
        const claims = await sessions.verify(decodeURIComponent(match[1]))
        return claims.sub
      }) satisfies ConsentUser)
      .compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'mcp/user', method: RequestMethod.ALL }],
    })
    const http = app.getHttpAdapter().getInstance() as Express
    http.set('query parser', 'extended')
    await app.listen(0)
    const address = app.getHttpServer().address()
    const port = typeof address === 'object' && address ? address.port : 0
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    await app?.close()
  })

  it('does not authenticate /mcp/user with a valid session cookie', async () => {
    const web = await fetch(`${baseUrl}/api/me/connected-apps`, { headers: { cookie: sessionCookie } })
    expect(web.status).toBe(200)
    const mcp = await fetch(`${baseUrl}/mcp/user`, {
      method: 'POST',
      headers: {
        cookie: sessionCookie,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    })
    expect(mcp.status).toBe(401)
    expect(mcp.headers.get('www-authenticate')).toBe(unauthenticatedChallenge())
  })

  it.each([
    ['string', 'access_token=secret'],
    ['empty', 'access_token='],
    ['list', 'access_token=one&access_token=two'],
  ])('rejects an access_token query %s with 400', async (_kind, query) => {
    const response = await fetch(`${baseUrl}/mcp/user?${query}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    })
    expect(response.status).toBe(400)
    expect(((await response.json()) as { error: string }).error).toBe('invalid_request')
  })
})
