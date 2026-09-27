import { UnauthorizedException, type ExecutionContext } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { createSessionJwt } from '../infrastructure/session-jwt'
import { SessionAuthGuard } from './session-auth.guard'

const secret = 'test-secret-at-least-32-characters!!'
const jwt = createSessionJwt({ secret })
const cookie = {
  name: 'cq_session',
  maxAgeSeconds: 60,
  secure: true,
  sameSite: 'none' as const,
  httpOnly: true,
  path: '/',
}

function context(input: { cookie?: string; authorization?: string }) {
  const req: { cookies: Record<string, string>; headers: { authorization?: string }; userId?: string } = {
    cookies: input.cookie ? { cq_session: input.cookie } : {},
    headers: input.authorization ? { authorization: input.authorization } : {},
  }
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    req,
  }
}

describe('SessionAuthGuard', () => {
  const guard = new SessionAuthGuard(jwt, cookie)

  it('accepts the same session JWT in Authorization when the cookie is absent', async () => {
    const token = await jwt.sign({ userId: 'user-1', displayName: 'Guido' })
    const ctx = context({ authorization: `Bearer ${token}` })
    await expect(guard.canActivate(ctx as unknown as ExecutionContext)).resolves.toBe(true)
    expect(ctx.req.userId).toBe('user-1')
  })

  it('prefers the cookie over a bearer token', async () => {
    const cookieToken = await jwt.sign({ userId: 'cookie-user' })
    const bearerToken = await jwt.sign({ userId: 'bearer-user' })
    const ctx = context({ cookie: cookieToken, authorization: `Bearer ${bearerToken}` })
    await expect(guard.canActivate(ctx as unknown as ExecutionContext)).resolves.toBe(true)
    expect(ctx.req.userId).toBe('cookie-user')
  })

  it('rejects a bearer token the session signer does not accept', async () => {
    const other = createSessionJwt({ secret: 'another-secret-at-least-32-characters' })
    const token = await other.sign({ userId: 'user-1' })
    const ctx = context({ authorization: `Bearer ${token}` })
    await expect(guard.canActivate(ctx as unknown as ExecutionContext)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })
})