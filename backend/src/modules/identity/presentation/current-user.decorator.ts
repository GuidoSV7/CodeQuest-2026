import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AuthenticatedRequest } from './session-auth.guard'

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    if (!req.userId) {
      throw new Error('CurrentUserId used without SessionAuthGuard')
    }
    return req.userId
  },
)
