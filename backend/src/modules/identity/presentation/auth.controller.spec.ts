import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import type { INestApplication } from '@nestjs/common'
import type { Server } from 'node:http'
import {
  createAuthService,
  type AuthService,
} from '../application/auth.service'
import type { DiscordOAuthClient } from '../infrastructure/discord-oauth.client'
import { createMemoryOAuthStateStore } from '../infrastructure/memory-oauth-state-store'
import { createSessionJwt } from '../infrastructure/session-jwt'
import { createTypeormUserRepository } from '../infrastructure/typeorm-user.repository'
import {
  AUTH_COOKIE_OPTIONS,
  AUTH_SERVICE,
  SESSION_JWT,
  type AuthCookieOptions,
} from '../identity.tokens'
import { AuthController } from '../presentation/auth.controller'
import { SessionAuthGuard } from '../presentation/session-auth.guard'
import {
  startPgTestContext,
  truncateAll,
  type PgTestContext,
} from '../../../test-utils/pg-test-context'

describe('AuthController (HTTP)', () => {
  let pg: PgTestContext
  let app: INestApplication
  let baseUrl: string
  let auth: AuthService
  let discordExchange: ReturnType<typeof vi.fn>

  const cookieOpts: AuthCookieOptions = {
    name: 'cq_session',
    maxAgeSeconds: 7 * 24 * 60 * 60,
    secure: false,
    sameSite: 'lax',
    httpOnly: true,
    path: '/',
  }

  async function http(
    method: string,
    path: string,
    options: { cookie?: string } = {},
  ): Promise<{
    status: number
    headers: Headers
    body: string
    json: () => unknown
  }> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: options.cookie ? { Cookie: options.cookie } : undefined,
      redirect: 'manual',
    })
    const body = await res.text()
    return {
      status: res.status,
      headers: res.headers,
      body,
      json: () => (body ? JSON.parse(body) : null),
    }
  }

  function sessionCookieFrom(headers: Headers): string | null {
    const list =
      typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : []
    const raw =
      list.find((c) => c.startsWith('cq_session=')) ??
      headers.get('set-cookie') ??
      ''
    const match = /(?:^|,\s*)cq_session=([^;]+)/.exec(raw)
    return match?.[1] ?? null
  }

  beforeAll(async () => {
    pg = await startPgTestContext()
    await pg.dataSource.runMigrations()
  }, 120_000)

  afterAll(async () => {
    if (app) await app.close()
    await pg.stop()
  })

  beforeEach(async () => {
    await truncateAll(pg.dataSource)
    if (app) await app.close()

    discordExchange = vi.fn(async () => ({
      id: 'http-disc-1',
      displayName: 'Http User',
      email: null,
      avatarUrl: null,
    }))

    const discord: DiscordOAuthClient = {
      buildAuthorizeUrl: (state) =>
        `https://discord.com/oauth2/authorize?client_id=test&state=${state}&scope=identify%20email`,
      exchangeCodeAndFetchUser: discordExchange,
    }

    const sessionJwt = createSessionJwt({
      secret: 'test-secret-at-least-32-characters!!',
    })
    const stateStore = createMemoryOAuthStateStore()
    auth = createAuthService({
      stateStore,
      discord,
      users: createTypeormUserRepository(pg.dataSource),
      sessionJwt,
      oauthStateTtlSeconds: 600,
      frontendUrl: 'http://localhost:5173',
    })

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AUTH_SERVICE, useValue: auth },
        { provide: AUTH_COOKIE_OPTIONS, useValue: cookieOpts },
        { provide: SESSION_JWT, useValue: sessionJwt },
        SessionAuthGuard,
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.use(cookieParser())
    await app.listen(0, '127.0.0.1')
    const server = app.getHttpServer() as Server
    const addr = server.address()
    if (!addr || typeof addr === 'string') throw new Error('no address')
    baseUrl = `http://127.0.0.1:${addr.port}`
  })

  it('GET /api/auth/discord/start redirects to Discord', async () => {
    const res = await http('GET', '/api/auth/discord/start')
    expect(res.status).toBe(302)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('discord.com/oauth2/authorize')
    expect(location).toContain('identify')
  })

  it('callback invalid state redirects to error without Set-Cookie session', async () => {
    const res = await http(
      'GET',
      '/api/auth/discord/callback?code=x&state=bad',
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('reason=invalid_state')
    expect(sessionCookieFrom(res.headers)).toBeNull()
  })

  it('callback OK sets cq_session cookie', async () => {
    const start = await auth.startLogin('/')
    const res = await http(
      'GET',
      `/api/auth/discord/callback?code=ok&state=${encodeURIComponent(start.state)}`,
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('http://localhost:5173/')
    const token = sessionCookieFrom(res.headers)
    expect(token).toBeTruthy()
    const setCookie =
      (typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie().join(';')
        : null) ??
      res.headers.get('set-cookie') ??
      ''
    expect(setCookie.toLowerCase()).toContain('httponly')
    expect(discordExchange).toHaveBeenCalledOnce()
  })

  it('logout clears cookie and /me returns 401 without session', async () => {
    const start = await auth.startLogin('/')
    const cb = await http(
      'GET',
      `/api/auth/discord/callback?code=ok&state=${encodeURIComponent(start.state)}`,
    )
    const token = sessionCookieFrom(cb.headers)
    expect(token).toBeTruthy()

    const meOk = await http('GET', '/api/auth/me', {
      cookie: `cq_session=${token}`,
    })
    expect(meOk.status).toBe(200)
    expect(meOk.json()).toMatchObject({
      displayName: 'Http User',
      email: null,
    })

    const logout = await http('POST', '/api/auth/logout', {
      cookie: `cq_session=${token}`,
    })
    expect(logout.status).toBe(204)

    const meAfter = await http('GET', '/api/auth/me')
    expect(meAfter.status).toBe(401)
  })
})
