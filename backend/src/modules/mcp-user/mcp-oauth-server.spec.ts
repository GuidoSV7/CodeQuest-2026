import 'reflect-metadata'
import { createHash, randomBytes } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RequestMethod, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { Express } from 'express'
import { McpUserModule } from './mcp-user.module'
import {
  MCP_CONSENT_USER,
  MCP_OAUTH_SERVER,
  mountMcpAuthorization,
  type ConsentUser,
} from './mount-mcp-authorization'
import type { OAuthServer } from 'mcp-oauth-server'
import { MCP_RESOURCE_URL } from './mcp-oauth.metadata'
import { MCP_CIMD_LOOKUP } from './cimd-fetch'

const RESOURCE = MCP_RESOURCE_URL

function pkce() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

describe('MCP authorization server', () => {
  let app: INestApplication
  let baseUrl: string
  const cimdUrl = 'https://client.example/oauth/client.json'

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [McpUserModule],
    })
      .overrideProvider('MCP_CIMD_FETCH')
      .useValue(async (input: string | URL) => {
        const url = String(input)
        if (url !== cimdUrl) return new Response('no', { status: 404 })
        return new Response(
          JSON.stringify({
            client_id: cimdUrl,
            client_name: 'Example',
            redirect_uris: ['http://127.0.0.1/callback'],
            token_endpoint_auth_method: 'none',
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      })
      .overrideProvider(MCP_CIMD_LOOKUP)
      .useValue(async () => ['1.1.1.1'])
      .overrideProvider('MCP_CONSENT_USER')
      .useValue(async () => '11111111-1111-4111-8111-111111111111')
      .compile()
    app = moduleRef.createNestApplication({ bodyParser: false })
    mountMcpAuthorization(
      app.getHttpAdapter().getInstance() as Express,
      app.get<OAuthServer>(MCP_OAUTH_SERVER),
      app.get<ConsentUser>(MCP_CONSENT_USER),
    )
    app.setGlobalPrefix('api', {
      exclude: [
        { path: 'authorize', method: RequestMethod.ALL },
        { path: 'token', method: RequestMethod.ALL },
        { path: 'register', method: RequestMethod.ALL },
        { path: 'oauth/approve', method: RequestMethod.ALL },
      ],
    })
    await app.listen(0)
    const address = app.getHttpServer().address()
    const port = typeof address === 'object' && address ? address.port : 0
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    await app?.close()
  })

  it('registers a DCR client and a CIMD client', async () => {
    const registered = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Loopback',
        redirect_uris: ['http://127.0.0.1/callback'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    })
    expect(registered.status).toBe(201)
    const client = (await registered.json()) as { client_id: string }
    expect(client.client_id).toBeTruthy()

    const challenge = pkce().challenge
    const cimd = await fetch(
      `${baseUrl}/authorize?response_type=code&client_id=${encodeURIComponent(cimdUrl)}&redirect_uri=${encodeURIComponent('http://127.0.0.1/callback')}&code_challenge=${challenge}&code_challenge_method=S256&resource=${encodeURIComponent(RESOURCE)}&state=cimd`,
      { redirect: 'manual' },
    )
    expect(cimd.status).toBe(302)
    const location = cimd.headers.get('location') ?? ''
    expect(location).not.toContain('error=')
  })

  it('rejects missing PKCE, plain PKCE, a foreign redirect, and a missing resource', async () => {
    const registered = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Checks',
        redirect_uris: ['http://127.0.0.1/callback'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    })
    const client = (await registered.json()) as { client_id: string }
    const redirect = encodeURIComponent('http://127.0.0.1/callback')

    const noPkce = await fetch(
      `${baseUrl}/authorize?response_type=code&client_id=${client.client_id}&redirect_uri=${redirect}&state=np`,
      { redirect: 'manual' },
    )
    expect(noPkce.status).toBe(302)
    const noPkceUrl = new URL(noPkce.headers.get('location') ?? 'http://127.0.0.1/callback')
    expect(noPkceUrl.searchParams.get('error')).toBeTruthy()
    expect(noPkceUrl.searchParams.get('iss')).toBe(
      'https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io',
    )

    const plain = await fetch(
      `${baseUrl}/authorize?response_type=code&client_id=${client.client_id}&redirect_uri=${redirect}&code_challenge=abc&code_challenge_method=plain&state=plain&resource=${encodeURIComponent(RESOURCE)}`,
      { redirect: 'manual' },
    )
    const plainUrl = new URL(plain.headers.get('location') ?? 'http://127.0.0.1/callback')
    expect(plainUrl.searchParams.get('error')).toBeTruthy()
    expect(plainUrl.searchParams.get('iss')).toBeTruthy()

    const foreign = await fetch(
      `${baseUrl}/authorize?response_type=code&client_id=${client.client_id}&redirect_uri=${encodeURIComponent('https://evil.example/cb')}&code_challenge=abc&code_challenge_method=S256`,
      { redirect: 'manual' },
    )
    expect(foreign.status).toBe(400)

    const challenge = pkce().challenge
    const noResource = await fetch(
      `${baseUrl}/authorize?response_type=code&client_id=${client.client_id}&redirect_uri=${redirect}&code_challenge=${challenge}&code_challenge_method=S256&state=nr`,
      { redirect: 'manual' },
    )
    const noResourceUrl = new URL(noResource.headers.get('location') ?? 'http://127.0.0.1/callback')
    expect(noResourceUrl.searchParams.get('error')).toBeTruthy()
    expect(noResourceUrl.searchParams.get('iss')).toBeTruthy()
  })

  it('accepts a loopback redirect on another port and rotates refresh tokens', async () => {
    const registered = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Native',
        redirect_uris: ['http://127.0.0.1/callback'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    })
    const client = (await registered.json()) as { client_id: string }
    const { verifier, challenge } = pkce()
    const redirectUri = 'http://127.0.0.1:49152/callback'
    const approved = await fetch(`${baseUrl}/oauth/approve`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: redirectUri,
        response_type: 'code',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        resource: RESOURCE,
        state: 'ok',
        scope: 'profile:read',
      }),
      redirect: 'manual',
    })
    expect(approved.status).toBe(302)
    const back = new URL(approved.headers.get('location') ?? 'http://127.0.0.1:49152/callback')
    expect(back.searchParams.get('iss')).toBe(
      'https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io',
    )
    const code = back.searchParams.get('code')
    expect(code).toBeTruthy()

    const tokenResponse = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code ?? '',
        code_verifier: verifier,
        redirect_uri: redirectUri,
        client_id: client.client_id,
        resource: RESOURCE,
      }),
    })
    expect(tokenResponse.status).toBe(200)
    const issued = (await tokenResponse.json()) as {
      access_token: string
      refresh_token: string
    }
    expect(issued.access_token).toBeTruthy()
    expect(issued.refresh_token).toBeTruthy()

    const userCall = await fetch(`${baseUrl}/mcp/user`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${issued.access_token}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    })
    expect(userCall.status).not.toBe(401)

    const rotated = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: issued.refresh_token,
        client_id: client.client_id,
        resource: RESOURCE,
      }),
    })
    expect(rotated.status).toBe(200)
    const next = (await rotated.json()) as { refresh_token: string }
    expect(next.refresh_token).not.toBe(issued.refresh_token)

    const reused = await fetch(`${baseUrl}/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: issued.refresh_token,
        client_id: client.client_id,
        resource: RESOURCE,
      }),
    })
    expect(reused.status).toBe(400)
    expect(((await reused.json()) as { error: string }).error).toBe('invalid_grant')
  })
})
