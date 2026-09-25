import { Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Req, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import type { OAuthServer } from 'mcp-oauth-server'
import { CONNECTED_APPS, ConnectedApps } from './mcp-consent.routes'
import { MCP_CONSENT_USER, MCP_OAUTH_SERVER, type ConsentUser } from './mount-mcp-authorization'

@Controller('me/connected-apps')
export class ConnectedAppsController {
  constructor(
    @Inject(MCP_CONSENT_USER) private readonly users: ConsentUser,
    @Inject(CONNECTED_APPS) private readonly apps: ConnectedApps,
    @Inject(MCP_OAUTH_SERVER) private readonly oauth: OAuthServer,
  ) {}

  @Get()
  async list(@Req() req: Request) {
    const userId = await this.userId(req)
    return this.apps.list(userId)
  }

  @Delete(':grantId')
  @HttpCode(204)
  async revoke(@Req() req: Request, @Param('grantId') grantId: string): Promise<void> {
    const userId = await this.userId(req)
    if (!this.apps.owns(userId, grantId)) throw new NotFoundException()
    await this.oauth.model.revokeGrant(grantId)
    this.apps.revoke(userId, grantId)
  }

  private async userId(req: Request): Promise<string> {
    const userId = await this.users(req)
    if (!userId) throw new UnauthorizedException('Missing session')
    return userId
  }
}
