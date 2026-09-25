import { describe, expect, it, vi } from 'vitest'
import {
  createDiscordOAuthClient,
  type DiscordHttpFetcher,
} from '../infrastructure/discord-oauth.client'

describe('DiscordOAuthClient', () => {
  it('exchanges code for token and fetches /users/@me', async () => {
    const fetcher: DiscordHttpFetcher = vi.fn(async (url, init) => {
      if (String(url).includes('/oauth2/token')) {
        return {
          status: 200,
          json: async () => ({
            access_token: 'atok',
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'rtok',
            scope: 'identify email',
          }),
        }
      }
      if (String(url).includes('/users/@me')) {
        expect(init?.headers?.Authorization).toBe('Bearer atok')
        return {
          status: 200,
          json: async () => ({
            id: '111',
            username: 'guido',
            global_name: 'Guido S',
            avatar: 'abc',
            email: 'g@example.com',
          }),
        }
      }
      throw new Error(`unexpected ${url}`)
    })

    const client = createDiscordOAuthClient({
      clientId: 'cid',
      clientSecret: 'csec',
      redirectUri: 'http://localhost:3000/api/auth/discord/callback',
      fetcher,
    })

    const profile = await client.exchangeCodeAndFetchUser('good-code')
    expect(profile.id).toBe('111')
    expect(profile.displayName).toBe('Guido S')
    expect(profile.email).toBe('g@example.com')
    expect(profile.avatarUrl).toContain('111')
    expect(profile.avatarUrl).toContain('abc')
  })

  it('rejects invalid code from token endpoint', async () => {
    const fetcher: DiscordHttpFetcher = vi.fn(async () => ({
      status: 400,
      json: async () => ({ error: 'invalid_grant' }),
    }))
    const client = createDiscordOAuthClient({
      clientId: 'cid',
      clientSecret: 'csec',
      redirectUri: 'http://localhost/cb',
      fetcher,
    })
    await expect(client.exchangeCodeAndFetchUser('bad')).rejects.toThrow(
      /token_exchange_failed|invalid/i,
    )
  })

  it('allows user without email', async () => {
    const fetcher: DiscordHttpFetcher = vi.fn(async (url) => {
      if (String(url).includes('/oauth2/token')) {
        return {
          status: 200,
          json: async () => ({
            access_token: 'atok',
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'identify email',
          }),
        }
      }
      return {
        status: 200,
        json: async () => ({
          id: '222',
          username: 'noemail',
          global_name: null,
          avatar: null,
          email: null,
        }),
      }
    })
    const client = createDiscordOAuthClient({
      clientId: 'cid',
      clientSecret: 'csec',
      redirectUri: 'http://localhost/cb',
      fetcher,
    })
    const profile = await client.exchangeCodeAndFetchUser('code')
    expect(profile.email).toBeNull()
    expect(profile.displayName).toBe('noemail')
    expect(profile.avatarUrl).toBe(
      'https://cdn.discordapp.com/embed/avatars/0.png',
    )
  })

  it('surfaces timeout/network errors', async () => {
    const fetcher: DiscordHttpFetcher = vi.fn(async () => {
      throw new Error('Timeout')
    })
    const client = createDiscordOAuthClient({
      clientId: 'cid',
      clientSecret: 'csec',
      redirectUri: 'http://localhost/cb',
      fetcher,
    })
    await expect(client.exchangeCodeAndFetchUser('x')).rejects.toThrow(/Timeout/)
  })
})
