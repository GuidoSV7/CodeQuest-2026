import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAuthService,
  sanitizeReturnTo,
} from '../application/auth.service'
import type { DiscordOAuthClient } from '../infrastructure/discord-oauth.client'
import { createMemoryOAuthStateStore } from '../infrastructure/memory-oauth-state-store'
import { createSessionJwt } from '../infrastructure/session-jwt'
import { createTypeormUserRepository } from '../infrastructure/typeorm-user.repository'
import {
  startPgTestContext,
  truncateAll,
  type PgTestContext,
} from '../../../test-utils/pg-test-context'

describe('sanitizeReturnTo', () => {
  it('allows relative paths and rejects open redirects', () => {
    expect(sanitizeReturnTo('/dashboard')).toBe('/dashboard')
    expect(sanitizeReturnTo(undefined)).toBe('/')
    expect(sanitizeReturnTo('https://evil.com')).toBe('/')
    expect(sanitizeReturnTo('//evil.com')).toBe('/')
  })

  it('allows only the local dev origin as an absolute return', () => {
    expect(sanitizeReturnTo('http://localhost:3000/configurador-de-ruta')).toBe(
      'http://localhost:3000/configurador-de-ruta',
    )
    expect(sanitizeReturnTo('http://127.0.0.1:3000/mis-rutas?x=1')).toBe(
      'http://127.0.0.1:3000/mis-rutas?x=1',
    )
    expect(sanitizeReturnTo('http://localhost:3001/')).toBe('/')
    expect(sanitizeReturnTo('https://localhost:3000/')).toBe('/')
    expect(sanitizeReturnTo('http://user@localhost:3000/')).toBe('/')
    expect(sanitizeReturnTo('http://localhost:3000.evil.com/')).toBe('/')
  })
})

describe('AuthService', () => {
  let pg: PgTestContext

  beforeAll(async () => {
    pg = await startPgTestContext()
    await pg.dataSource.runMigrations()
  }, 120_000)

  afterAll(async () => {
    await pg.stop()
  })

  beforeEach(async () => {
    await truncateAll(pg.dataSource)
  })

  function buildDiscord(
    profile: {
      id: string
      displayName: string
      email: string | null
      avatarUrl: string | null
    } = {
      id: 'disc-1',
      displayName: 'Guido',
      email: null,
      avatarUrl: null,
    },
  ): DiscordOAuthClient {
    return {
      buildAuthorizeUrl: (state) =>
        `https://discord.com/oauth2/authorize?state=${state}&scope=identify%20email`,
      exchangeCodeAndFetchUser: vi.fn(async () => profile),
    }
  }

  it('startLogin generates state and authorize URL with identify email', async () => {
    const stateStore = createMemoryOAuthStateStore()
    const auth = createAuthService({
      stateStore,
      discord: buildDiscord(),
      users: createTypeormUserRepository(pg.dataSource),
      sessionJwt: createSessionJwt({
        secret: 'test-secret-at-least-32-characters!!',
      }),
      oauthStateTtlSeconds: 600,
      frontendUrl: 'http://localhost:5173',
    })

    const result = await auth.startLogin('/paths')
    expect(result.state.length).toBeGreaterThanOrEqual(32)
    expect(result.authorizeUrl).toContain('identify')
    expect(result.authorizeUrl).toContain('email')
    expect(result.authorizeUrl).toContain(result.state)
    expect(await stateStore.consume(result.state)).toMatchObject({
      returnTo: '/paths',
    })
  })

  it('callback with invalid state redirects to error without creating user', async () => {
    const users = createTypeormUserRepository(pg.dataSource)
    const auth = createAuthService({
      stateStore: createMemoryOAuthStateStore(),
      discord: buildDiscord(),
      users,
      sessionJwt: createSessionJwt({
        secret: 'test-secret-at-least-32-characters!!',
      }),
      oauthStateTtlSeconds: 600,
      frontendUrl: 'http://localhost:5173',
    })

    const result = await auth.handleCallback({
      code: 'x',
      state: 'missing',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('invalid_state')
      expect(result.redirectUrl).toContain('reason=invalid_state')
    }
  })

  it('callback without email creates user and returns JWT', async () => {
    const stateStore = createMemoryOAuthStateStore()
    const users = createTypeormUserRepository(pg.dataSource)
    const discord = buildDiscord({
      id: 'd-no-email',
      displayName: 'NoEmail',
      email: null,
      avatarUrl: null,
    })
    const auth = createAuthService({
      stateStore,
      discord,
      users,
      sessionJwt: createSessionJwt({
        secret: 'test-secret-at-least-32-characters!!',
      }),
      oauthStateTtlSeconds: 600,
      frontendUrl: 'http://localhost:5173',
    })

    const { state } = await auth.startLogin('/')
    const result = await auth.handleCallback({ code: 'good', state })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.user.email).toBeNull()
    expect(result.token.length).toBeGreaterThan(10)
    expect(result.redirectUrl).toBe('http://localhost:5173/')
  })

  it('second login same Discord id reuses user and updates profile', async () => {
    const stateStore = createMemoryOAuthStateStore()
    const users = createTypeormUserRepository(pg.dataSource)
    const discord = buildDiscord({
      id: 'same-disc',
      displayName: 'First',
      email: 'a@example.com',
      avatarUrl: 'https://cdn.discordapp.com/avatars/1/a.png',
    })
    const auth = createAuthService({
      stateStore,
      discord,
      users,
      sessionJwt: createSessionJwt({
        secret: 'test-secret-at-least-32-characters!!',
      }),
      oauthStateTtlSeconds: 600,
      frontendUrl: 'http://localhost:5173',
    })

    const firstStart = await auth.startLogin()
    const first = await auth.handleCallback({
      code: 'c1',
      state: firstStart.state,
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    discord.exchangeCodeAndFetchUser = vi.fn(async () => ({
      id: 'same-disc',
      displayName: 'Second',
      email: null,
      avatarUrl: 'https://cdn.discordapp.com/avatars/1/b.png',
    }))

    const secondStart = await auth.startLogin()
    const second = await auth.handleCallback({
      code: 'c2',
      state: secondStart.state,
    })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.user.id).toBe(first.user.id)
    expect(second.user.displayName).toBe('Second')
    expect(second.user.email).toBe('a@example.com')
    expect(second.user.avatarUrl).toContain('b.png')
  })

  it('maps Discord token failures to token_exchange_failed', async () => {
    const stateStore = createMemoryOAuthStateStore()
    const auth = createAuthService({
      stateStore,
      discord: {
        buildAuthorizeUrl: () => 'https://discord.com/oauth2/authorize',
        exchangeCodeAndFetchUser: vi.fn(async () => {
          throw new Error('token_exchange_failed')
        }),
      },
      users: createTypeormUserRepository(pg.dataSource),
      sessionJwt: createSessionJwt({
        secret: 'test-secret-at-least-32-characters!!',
      }),
      oauthStateTtlSeconds: 600,
      frontendUrl: 'http://localhost:5173',
    })
    const { state } = await auth.startLogin()
    const result = await auth.handleCallback({ code: 'bad', state })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('token_exchange_failed')
  })
})
