import { SignJWT, jwtVerify, errors as JoseErrors } from 'jose'

export type SessionJwtClaims = {
  sub: string
  dn?: string
  iat: number
  exp: number
}

export type SessionJwtOptions = {
  secret: string
  ttlDays?: number
}

export type SessionJwt = {
  sign(input: { userId: string; displayName?: string }): Promise<string>
  verify(token: string): Promise<SessionJwtClaims>
}

export class SessionJwtError extends Error {
  constructor(
    message: string,
    readonly reason: 'expired' | 'invalid' | 'bad_signature',
  ) {
    super(message)
    this.name = 'SessionJwtError'
  }
}

export function createSessionJwt(options: SessionJwtOptions): SessionJwt {
  const secret = new TextEncoder().encode(options.secret)
  const ttlDays = options.ttlDays ?? 7
  const alg = 'HS256'

  return {
    async sign({ userId, displayName }) {
      const builder = new SignJWT(displayName ? { dn: displayName } : {})
        .setProtectedHeader({ alg })
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime(`${ttlDays}d`)

      return builder.sign(secret)
    },

    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, secret, {
          algorithms: [alg],
        })
        if (typeof payload.sub !== 'string' || !payload.sub) {
          throw new SessionJwtError('Missing sub claim', 'invalid')
        }
        if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
          throw new SessionJwtError('Missing iat/exp', 'invalid')
        }
        const claims: SessionJwtClaims = {
          sub: payload.sub,
          iat: payload.iat,
          exp: payload.exp,
        }
        if (typeof payload.dn === 'string') {
          claims.dn = payload.dn
        }
        return claims
      } catch (err) {
        if (err instanceof SessionJwtError) throw err
        if (err instanceof JoseErrors.JWTExpired) {
          throw new SessionJwtError('Token expired', 'expired')
        }
        if (
          err instanceof JoseErrors.JWSSignatureVerificationFailed ||
          err instanceof JoseErrors.JWSInvalid
        ) {
          throw new SessionJwtError('Bad signature', 'bad_signature')
        }
        throw new SessionJwtError(
          err instanceof Error ? err.message : 'Invalid token',
          'invalid',
        )
      }
    },
  }
}
