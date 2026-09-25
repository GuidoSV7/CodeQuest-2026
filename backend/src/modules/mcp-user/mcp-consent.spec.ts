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

function pkce() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

describe('MCP consent and connected apps', () => {
  let app: INestApplication
  let baseUrl: string
  let clientId = ''

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [McpUserModule],
    })
      .overrideProvider(MCP_CONSENT_USER)
      .useValue((async (req) => {
        const cookie = req.headers.cookie ?? ''
        if (!cookie.includes('cq_session=session-a')) return ''
        return '11111111-1111-4111-8111-111111111111'
      }) satisfies ConsentUser)
      .compile()
    app = moduleRef.createNestApplication({ bodyParser: false })
    app.setGlobalPrefix('api')
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
    const registered = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Claude',
        redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    })
    clientId = ((await registered.json()) as { client_id: string }).client_id
  })

  afterAll(async () => {
    await app?.close()
  })

  function authorizeQuery() {
    return new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_challenge: pkce().challenge,
      code_challenge_method: 'S256',
      resource: MCP_RESOURCE_URL,
      state: 'keep-me',
      scope: 'profile:read',
    })
  }

  it('shows consent when the web session exists', async () => {
    const started = await fetch(`${baseUrl}/authorize?${authorizeQuery()}`, { redirect: 'manual' })
    expect(started.status).toBe(302)
    const consent = await fetch(new URL(started.headers.get('location') ?? '', baseUrl), {
      headers: { cookie: 'cq_session=session-a' },
      redirect: 'manual',
    })
    expect(consent.status).toBe(200)
    const html = await consent.text()
    expect(html).toContain('Permitir')
    expect(html).toContain('claude.ai')
    expect(html).toContain('csrf')
  })

  it('sends a missing session to Discord and blocks an external return', async () => {
    const started = await fetch(`${baseUrl}/authorize?${authorizeQuery()}`, { redirect: 'manual' })
    const consent = await fetch(new URL(started.headers.get('location') ?? '', baseUrl), {
      redirect: 'manual',
    })
    expect(consent.status).toBe(302)
    const login = consent.headers.get('location') ?? ''
    expect(login).toContain('/api/auth/discord/start')
    expect(login).not.toContain('claude.ai')
    const resumeId = new URL(login, baseUrl).searchParams.get('mcp_resume') ?? ''
    expect(resumeId).toMatch(/^[A-Za-z0-9_-]+$/)
    const back = await fetch(`${baseUrl}/oauth/resume?rid=${resumeId}`, {
      headers: { cookie: 'cq_session=session-a' },
      redirect: 'manual',
    })
    expect(back.status).toBe(302)
    const restored = new URL(back.headers.get('location') ?? '', baseUrl)
    expect(restored.pathname).toBe('/oauth/consent')
    expect(restored.searchParams.get('state')).toBe('keep-me')
    expect(restored.searchParams.get('client_id')).toBe(clientId)
    expect(restored.searchParams.get('redirect_uri')).toBe('https://claude.ai/api/mcp/auth_callback')

    const hijack = await fetch(`${baseUrl}/oauth/resume?rid=https://evil.example`, { redirect: 'manual' })
    const hijackLocation = hijack.headers.get('location') ?? ''
    expect(hijackLocation).not.toContain('evil.example')
  })

  it('rejects consent without CSRF and returns access_denied when the user refuses', async () => {
    const started = await fetch(`${baseUrl}/authorize?${authorizeQuery()}`, { redirect: 'manual' })
    const consentUrl = new URL(started.headers.get('location') ?? '', baseUrl)
    const page = await fetch(consentUrl, { headers: { cookie: 'cq_session=session-a' } })
    const html = await page.text()
    const csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1] ?? ''
    expect(csrf).not.toBe('')

    const missing = await fetch(consentUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: 'cq_session=session-a' },
      body: new URLSearchParams({ decision: 'deny' }),
      redirect: 'manual',
    })
    expect(missing.status).toBe(403)

    const denied = await fetch(consentUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: 'cq_session=session-a' },
      body: new URLSearchParams({ decision: 'deny', csrf }),
      redirect: 'manual',
    })
    expect(denied.status).toBe(302)
    const back = new URL(denied.headers.get('location') ?? 'https://claude.ai/api/mcp/auth_callback')
    expect(back.searchParams.get('error')).toBe('access_denied')
    expect(back.searchParams.get('iss')).toBe(
      'https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io',
    )
    expect(back.searchParams.get('state')).toBe('keep-me')
  })

  it('lists a connected app and revokes it', async () => {
    const query = authorizeQuery()
    const started = await fetch(`${baseUrl}/authorize?${query}`, { redirect: 'manual' })
    const consentUrl = new URL(started.headers.get('location') ?? '', baseUrl)
    const html = await (
      await fetch(consentUrl, { headers: { cookie: 'cq_session=session-a' } })
    ).text()
    const csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1] ?? ''
    const allowed = await fetch(consentUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: 'cq_session=session-a' },
      body: new URLSearchParams({ decision: 'allow', csrf }),
      redirect: 'manual',
    })
    expect(allowed.status).toBe(302)

    const list = await fetch(`${baseUrl}/api/me/connected-apps`, {
      headers: { cookie: 'cq_session=session-a' },
    })
    expect(list.status).toBe(200)
    const apps = (await list.json()) as Array<{ grant_id: string; hostname: string }>
    expect(apps[0]?.hostname).toBe('claude.ai')
    const removed = await fetch(`${baseUrl}/api/me/connected-apps/${apps[0]?.grant_id}`, {
      method: 'DELETE',
      headers: { cookie: 'cq_session=session-a' },
    })
    expect(removed.status).toBe(204)
    const after = (await (
      await fetch(`${baseUrl}/api/me/connected-apps`, { headers: { cookie: 'cq_session=session-a' } })
    ).json()) as unknown[]
    expect(after).toEqual([])
  })
})
