import 'reflect-metadata'
import { createHash, randomBytes } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Express } from 'express'
import { Test } from '@nestjs/testing'
import { RequestMethod, type INestApplication } from '@nestjs/common'
import type { OAuthServer } from 'mcp-oauth-server'
import { McpUserModule } from './mcp-user.module'
import {
  CONNECTED_APPS,
  MCP_CONSENT_USER,
  MCP_OAUTH_SERVER,
  mountMcpAuthorization,
  type ConsentUser,
} from './mount-mcp-authorization'
import { MCP_RESOURCE_URL } from './mcp-oauth.metadata'
import { ConnectedApps } from './mcp-consent.routes'

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'

function pkce() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

describe('MCP grant revocation', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [McpUserModule] })
      .overrideProvider(MCP_CONSENT_USER)
      .useValue((async (req) => {
        const cookie = req.headers.cookie ?? ''
        if (cookie.includes('cq_session=session-a')) return USER_A
        if (cookie.includes('cq_session=session-b')) return USER_B
        return ''
      }) satisfies ConsentUser)
      .compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'mcp/user', method: RequestMethod.ALL }],
    })
    mountMcpAuthorization(
      app.getHttpAdapter().getInstance() as Express,
      app.get<OAuthServer>(MCP_OAUTH_SERVER),
      app.get<ConsentUser>(MCP_CONSENT_USER),
      app.get<ConnectedApps>(CONNECTED_APPS),
    )
    await app.listen(0)
    const address = app.getHttpServer().address()
    const port = typeof address === 'object' && address ? address.port : 0
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    const server = app?.getHttpServer() as { closeAllConnections?: () => void } | undefined
    server?.closeAllConnections?.()
    await app?.close()
  })

  async function register(name: string, redirectUri: string) {
    const registered = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: name,
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    })
    expect(registered.status).toBe(201)
    return ((await registered.json()) as { client_id: string }).client_id
  }

  async function issue(clientId: string, redirectUri: string) {
    const { verifier, challenge } = pkce()
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      resource: MCP_RESOURCE_URL,
      state: 'keep-me',
      scope: 'profile:read paths:read',
    })
    const started = await fetch(`${baseUrl}/authorize?${query}`, { redirect: 'manual' })
    const consentUrl = new URL(started.headers.get('location') ?? '', baseUrl)
    const html = await (
      await fetch(consentUrl, { headers: { cookie: 'cq_session=session-a' } })
    ).text()
    const csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1] ?? ''
    const allowed = await fetch(consentUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: 'cq_session=session-a',
      },
      body: new URLSearchParams({ decision: 'allow', csrf }),
      redirect: 'manual',
    })
    const code = new URL(allowed.headers.get('location') ?? redirectUri).searchParams.get('code') ?? ''
    const traded = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        redirect_uri: redirectUri,
        client_id: clientId,
        resource: MCP_RESOURCE_URL,
      }),
    })
    expect(traded.status).toBe(200)
    return (await traded.json()) as { access_token: string; refresh_token: string }
  }

  async function callMcp(accessToken: string) {
    return fetch(`${baseUrl}/mcp/user`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'revoke-test', version: '0' },
        },
      }),
    })
  }

  it('revokes one grant from the web and leaves the other app working', async () => {
    const redirectA = 'https://app-a.example/callback'
    const redirectB = 'https://app-b.example/callback'
    const clientA = await register('App A', redirectA)
    const clientB = await register('App B', redirectB)
    const tokensA = await issue(clientA, redirectA)
    const tokensB = await issue(clientB, redirectB)
    expect((await callMcp(tokensA.access_token)).status).toBe(200)
    expect((await callMcp(tokensB.access_token)).status).toBe(200)

    const listed = await fetch(`${baseUrl}/api/me/connected-apps`, {
      headers: { cookie: 'cq_session=session-a' },
    })
    const apps = (await listed.json()) as Array<{ grant_id: string; hostname: string }>
    const grantA = apps.find((row) => row.hostname === 'app-a.example')?.grant_id ?? ''
    const grantB = apps.find((row) => row.hostname === 'app-b.example')?.grant_id ?? ''
    expect(grantA).not.toBe('')
    expect(grantB).not.toBe(grantA)

    const removed = await fetch(`${baseUrl}/api/me/connected-apps/${grantA}`, {
      method: 'DELETE',
      headers: { cookie: 'cq_session=session-a' },
    })
    expect(removed.status).toBe(204)
    expect((await callMcp(tokensA.access_token)).status).toBe(401)

    const refreshed = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokensA.refresh_token,
        client_id: clientA,
        resource: MCP_RESOURCE_URL,
      }),
    })
    expect(refreshed.status).toBe(400)
    expect(((await refreshed.json()) as { error: string }).error).toBe('invalid_grant')
    expect((await callMcp(tokensB.access_token)).status).toBe(200)

    const foreign = await fetch(`${baseUrl}/api/me/connected-apps/${grantB}`, {
      method: 'DELETE',
      headers: { cookie: 'cq_session=session-b' },
    })
    expect(foreign.status).toBe(404)
    expect((await callMcp(tokensB.access_token)).status).toBe(200)
  })
})
