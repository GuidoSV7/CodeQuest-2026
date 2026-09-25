import type { Request } from 'express'
import { describe, expect, it } from 'vitest'
import { createSessionJwt } from '../identity/infrastructure/session-jwt'
import { createSessionConsentUser } from './session-consent-user'

describe('session consent user', () => {
  it('reads the Discord session from the Cookie header', async () => {
    const sessions = createSessionJwt({ secret: 'test-session-secret-32-characters' })
    const token = await sessions.sign({
      userId: '11111111-1111-4111-8111-111111111111',
      displayName: 'Ada',
    })
    const user = createSessionConsentUser(sessions, 'cq_session')
    const req = { headers: { cookie: `cq_session=${token}` }, cookies: undefined } as Request
    await expect(user(req)).resolves.toBe('11111111-1111-4111-8111-111111111111')
    await expect(user({ headers: {}, cookies: {} } as Request)).resolves.toBe('')
  })
})
