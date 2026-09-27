import { randomBytes } from 'node:crypto'
import type { DiscordOAuthClient } from '../infrastructure/discord-oauth.client'
import type { SessionJwt } from '../infrastructure/session-jwt'
import type { OAuthStateStore } from '../ports/oauth-state-store.port'
import type { UserRecord, UserRepository } from '../ports/user-repository.port'
import { sessionHandoffUrl } from './session-handoff'

export type AuthCallbackReason =
  | 'access_denied'
  | 'invalid_state'
  | 'token_exchange_failed'
  | 'profile_failed'
  | 'persist_failed'

export type AuthServiceDeps = {
  stateStore: OAuthStateStore
  discord: DiscordOAuthClient
  users: UserRepository
  sessionJwt: SessionJwt
  oauthStateTtlSeconds: number
  frontendUrl: string
}

export type StartLoginResult = {
  authorizeUrl: string
  state: string
}

export type CallbackSuccess = {
  ok: true
  token: string
  redirectUrl: string
  user: UserRecord
}

export type CallbackFailure = {
  ok: false
  reason: AuthCallbackReason
  redirectUrl: string
}

export type CallbackResult = CallbackSuccess | CallbackFailure

const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1'])

/** Relative path whitelist for post-login redirect; rejects open redirects. */
export function sanitizeReturnTo(raw: string | undefined | null): string {
  if (!raw) return '/'
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('://') && !raw.includes('\\')) {
    return raw
  }
  try {
    const url = new URL(raw)
    if (url.username || url.password || url.protocol !== 'http:' || url.port !== '3000') return '/'
    if (!LOCAL_DEV_HOSTS.has(url.hostname)) return '/'
    return `${url.origin}${url.pathname}${url.search}`
  } catch {
    return '/'
  }
}

function errorRedirect(frontendUrl: string, reason: AuthCallbackReason): string {
  const url = new URL('/auth/error', frontendUrl)
  url.searchParams.set('reason', reason)
  return url.toString()
}

export function createAuthService(deps: AuthServiceDeps) {
  const {
    stateStore,
    discord,
    users,
    sessionJwt,
    oauthStateTtlSeconds,
    frontendUrl,
  } = deps

  return {
    async startLogin(returnTo?: string, mcpResumeId?: string): Promise<StartLoginResult> {
      const state = randomBytes(32).toString('base64url')
      const resume = mcpResumeId && /^[A-Za-z0-9_-]{8,128}$/.test(mcpResumeId) ? mcpResumeId : undefined
      const payload = {
        returnTo: sanitizeReturnTo(returnTo),
        createdAt: Date.now(),
        mcpResumeId: resume,
      }
      try {
        await stateStore.save(state, payload, oauthStateTtlSeconds)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        throw new Error(`oauth_state_persist_failed: ${message}`)
      }
      return {
        state,
        authorizeUrl: discord.buildAuthorizeUrl(state),
      }
    },

    async handleCallback(input: {
      code?: string
      state?: string
      error?: string
    }): Promise<CallbackResult> {
      if (input.error === 'access_denied') {
        return {
          ok: false,
          reason: 'access_denied',
          redirectUrl: errorRedirect(frontendUrl, 'access_denied'),
        }
      }

      if (!input.state || !input.code) {
        return {
          ok: false,
          reason: 'invalid_state',
          redirectUrl: errorRedirect(frontendUrl, 'invalid_state'),
        }
      }

      const statePayload = await stateStore.consume(input.state)
      if (!statePayload) {
        return {
          ok: false,
          reason: 'invalid_state',
          redirectUrl: errorRedirect(frontendUrl, 'invalid_state'),
        }
      }

      let profile
      try {
        profile = await discord.exchangeCodeAndFetchUser(input.code)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const reason: AuthCallbackReason = /profile_failed/i.test(message)
          ? 'profile_failed'
          : 'token_exchange_failed'
        return {
          ok: false,
          reason,
          redirectUrl: errorRedirect(frontendUrl, reason),
        }
      }

      let user: UserRecord
      try {
        const existing = await users.findByProviderAccount('discord', profile.id)
        if (existing) {
          user = await users.updateProfile(existing.user.id, {
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            email: profile.email,
          })
        } else {
          const created = await users.createWithDiscordAccount({
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            email: profile.email,
            providerAccountId: profile.id,
          })
          user = created.user
        }
      } catch {
        return {
          ok: false,
          reason: 'persist_failed',
          redirectUrl: errorRedirect(frontendUrl, 'persist_failed'),
        }
      }

      const token = await sessionJwt.sign({
        userId: user.id,
        displayName: user.displayName,
      })

      if (statePayload.mcpResumeId) {
        return {
          ok: true,
          token,
          redirectUrl: `/oauth/resume?rid=${statePayload.mcpResumeId}`,
          user,
        }
      }

      const redirectUrl = sessionHandoffUrl(
        new URL(statePayload.returnTo, frontendUrl).toString(),
        token,
      )
      return { ok: true, token, redirectUrl, user }
    },

    async getMe(userId: string): Promise<UserRecord | null> {
      return users.findById(userId)
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
