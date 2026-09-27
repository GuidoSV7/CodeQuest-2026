import { describe, expect, it } from 'vitest'
import { validateEnv } from './env.validation'

const base = {
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_NAME: 'codequest',
}

describe('validateEnv auth vars', () => {
  it('applies auth defaults in development', () => {
    const env = validateEnv({ ...base, NODE_ENV: 'development' })
    expect(env.SESSION_TTL_DAYS).toBe(7)
    expect(env.OAUTH_STATE_TTL_SECONDS).toBe(600)
    expect(env.SESSION_COOKIE_NAME).toBe('cq_session')
    expect(env.SESSION_COOKIE_SECURE).toBe(false)
    expect(env.SESSION_COOKIE_SAMESITE).toBe('lax')
    expect(env.FRONTEND_URL).toBe('http://localhost:3000')
    expect(env.LOG_LEVEL).toBeUndefined()
  })

  it('rejects SameSite=None without Secure', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'development',
        SESSION_COOKIE_SECURE: 'false',
        SESSION_COOKIE_SAMESITE: 'none',
      }),
    ).toThrow(/SameSite=None/)
  })

  it('requires Discord and JWT secret in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        DISCORD_CLIENT_ID: '',
        SESSION_JWT_SECRET: 'short',
      }),
    ).toThrow(/Invalid environment/)
  })

  it('accepts production when required auth vars are set', () => {
    const env = validateEnv({
      ...base,
      NODE_ENV: 'production',
      DISCORD_CLIENT_ID: 'cid',
      DISCORD_CLIENT_SECRET: 'csec',
      DISCORD_REDIRECT_URI: 'https://api.example.com/api/auth/discord/callback',
      SESSION_JWT_SECRET: 'production-secret-at-least-32-chars!',
      FRONTEND_URL: 'https://app.example.com',
    })
    expect(env.SESSION_COOKIE_SECURE).toBe(true)
    expect(env.SESSION_COOKIE_SAMESITE).toBe('none')
  })
})
