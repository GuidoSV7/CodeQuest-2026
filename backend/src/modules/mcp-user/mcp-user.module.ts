import { Module } from '@nestjs/common'
import { MemoryOAuthServerModel, OAuthServer } from 'mcp-oauth-server'
import { McpUserController } from './mcp-user.controller'
import { ConnectedAppsController } from './connected-apps.controller'
import { CONNECTED_APPS, ConnectedApps } from './mcp-consent.routes'
import {
  MCP_CIMD_FETCH,
  MCP_CONSENT_USER,
  MCP_OAUTH_SERVER,
  type ConsentUser,
} from './mount-mcp-authorization'
import {
  MCP_ISSUER_URL,
  MCP_RESOURCE_URL,
  MCP_SCOPES,
} from './mcp-oauth.metadata'
import { MCP_TOKEN_VERIFIER, type McpTokenVerifier } from './mcp-token-verifier'

@Module({
  controllers: [McpUserController, ConnectedAppsController],
  providers: [
    { provide: CONNECTED_APPS, useClass: ConnectedApps },
    { provide: MCP_CIMD_FETCH, useValue: globalThis.fetch.bind(globalThis) },
    {
      provide: MCP_CONSENT_USER,
      useValue: (async () => {
        throw new Error('consent_user_unavailable')
      }) satisfies ConsentUser,
    },
    {
      provide: MCP_OAUTH_SERVER,
      inject: [MCP_CIMD_FETCH],
      useFactory: (cimdFetch: typeof fetch) =>
        new OAuthServer({
          model: new MemoryOAuthServerModel(),
          issuerUrl: new URL(MCP_ISSUER_URL),
          resourceServerUrl: new URL(MCP_RESOURCE_URL),
          authorizationUrl: new URL(`${MCP_ISSUER_URL}/oauth/consent`),
          scopesSupported: [...MCP_SCOPES],
          accessTokenLifetime: 900,
          refreshTokenLifetime: 1_209_600,
          strictResource: true,
          dynamicClientRegistration: true,
          allowInsecureRedirectUris: false,
          clientIdMetadataDocuments: { fetch: cimdFetch, fetchTimeoutMs: 1500 },
          grantTypes: ['authorization_code', 'refresh_token'],
        }),
    },
    {
      provide: MCP_TOKEN_VERIFIER,
      inject: [MCP_OAUTH_SERVER],
      useFactory: (oauth: OAuthServer): McpTokenVerifier => ({
        async verifyAccessToken(token: string) {
          const info = await oauth.verifyAccessToken(token)
          const resource = info.resource ? info.resource.href.replace(/\/$/, '') : ''
          return {
            userId: info.userId ?? '',
            scopes: info.scopes,
            resource,
            expiresAt: info.expiresAt ?? 0,
          }
        },
      }),
    },
  ],
  exports: [MCP_OAUTH_SERVER, MCP_CONSENT_USER, MCP_TOKEN_VERIFIER, CONNECTED_APPS],
})
export class McpUserModule {}
