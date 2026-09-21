import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import {
  SessionJwtError,
  type SessionJwt,
} from '../infrastructure/session-jwt'
import {
  AUTH_COOKIE_OPTIONS,
  SESSION_JWT,
  type AuthCookieOptions,
} from '../identity.tokens'

export type AuthenticatedRequest = Request & {
  userId?: string
  sessionDisplayName?: string
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(SESSION_JWT) private readonly sessionJwt: SessionJwt,
    @Inject(AUTH_COOKIE_OPTIONS) private readonly cookie: AuthCookieOptions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = req.cookies?.[this.cookie.name]
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Missing session')
    }
    try {
      const claims = await this.sessionJwt.verify(token)
      req.userId = claims.sub
      if (claims.dn) req.sessionDisplayName = claims.dn
      return true
    } catch (err) {
      if (err instanceof SessionJwtError || err instanceof Error) {
        throw new UnauthorizedException('Invalid session')
      }
      throw new UnauthorizedException('Invalid session')
    }
  }
}
