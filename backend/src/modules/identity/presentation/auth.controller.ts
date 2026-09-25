import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'
import type { AuthService } from '../application/auth.service'
import {
  AUTH_COOKIE_OPTIONS,
  AUTH_SERVICE,
  type AuthCookieOptions,
} from '../identity.tokens'
import { CurrentUserId } from './current-user.decorator'
import { SessionAuthGuard } from './session-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly auth: AuthService,
    @Inject(AUTH_COOKIE_OPTIONS) private readonly cookie: AuthCookieOptions,
  ) {}

  @Get('discord/start')
  async startDiscord(
    @Query('returnTo') returnTo: string | undefined,
    @Query('mcp_resume') mcpResume: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const { authorizeUrl } = await this.auth.startLogin(returnTo, mcpResume)
      res.redirect(302, authorizeUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('oauth_state_persist_failed')) {
        throw new ServiceUnavailableException('Unable to start login')
      }
      throw err
    }
  }

  @Get('discord/callback')
  async discordCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.auth.handleCallback({ code, state, error })
    if (!result.ok) {
      res.redirect(302, result.redirectUrl)
      return
    }
    res.cookie(this.cookie.name, result.token, {
      httpOnly: this.cookie.httpOnly,
      sameSite: this.cookie.sameSite,
      secure: this.cookie.secure,
      path: this.cookie.path,
      maxAge: this.cookie.maxAgeSeconds * 1000,
    })
    res.redirect(302, result.redirectUrl)
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(this.cookie.name, {
      httpOnly: this.cookie.httpOnly,
      sameSite: this.cookie.sameSite,
      secure: this.cookie.secure,
      path: this.cookie.path,
    })
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async me(@CurrentUserId() userId: string) {
    const user = await this.auth.getMe(userId)
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
    }
  }
}
