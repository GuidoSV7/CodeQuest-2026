import { describe, expect, it } from 'vitest'
import { SignJWT } from 'jose'
import { createSessionJwt, SessionJwtError } from './session-jwt'

describe('createSessionJwt', () => {
  const secret = 'test-secret-at-least-32-characters!!'

  it('signs and verifies a valid token', async () => {
    const jwt = createSessionJwt({ secret, ttlDays: 7 })
    const token = await jwt.sign({ userId: 'user-1', displayName: 'Guido' })
    const claims = await jwt.verify(token)
    expect(claims.sub).toBe('user-1')
    expect(claims.dn).toBe('Guido')
    expect(claims.iat).toBeTypeOf('number')
    expect(claims.exp).toBeTypeOf('number')
    expect(claims.exp - claims.iat).toBeGreaterThan(6 * 24 * 60 * 60)
  })

  it('rejects expired tokens', async () => {
    const jwt = createSessionJwt({ secret })
    const expired = await new SignJWT({ dn: 'x' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(secret))

    await expect(jwt.verify(expired)).rejects.toMatchObject({
      reason: 'expired',
    } satisfies Partial<SessionJwtError>)
  })

  it('rejects bad signatures', async () => {
    const jwt = createSessionJwt({ secret })
    const other = createSessionJwt({ secret: 'other-secret-at-least-32-chars!!!!' })
    const token = await other.sign({ userId: 'user-1' })
    await expect(jwt.verify(token)).rejects.toBeInstanceOf(SessionJwtError)
  })
})
