import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { OAuthServer } from 'mcp-oauth-server'
import {
  startPgTestContext,
  type PgTestContext,
} from '../../test-utils/pg-test-context'
import { createPostgresOAuthServerModel } from './postgres-oauth-server.model'
import { MCP_ISSUER_URL, MCP_RESOURCE_URL, MCP_SCOPES } from './mcp-oauth.metadata'

function serverFor(model: ReturnType<typeof createPostgresOAuthServerModel>) {
  return new OAuthServer({
    model,
    issuerUrl: new URL(MCP_ISSUER_URL),
    resourceServerUrl: new URL(MCP_RESOURCE_URL),
    authorizationUrl: new URL(`${MCP_ISSUER_URL}/oauth/consent`),
    scopesSupported: [...MCP_SCOPES],
    accessTokenLifetime: 900,
    refreshTokenLifetime: 1_209_600,
    strictResource: true,
    dynamicClientRegistration: true,
    grantTypes: ['authorization_code', 'refresh_token'],
  })
}

describe('postgres oauth model', () => {
  let pg: PgTestContext
  let userId: string

  beforeAll(async () => {
    pg = await startPgTestContext()
    await pg.dataSource.runMigrations()
    const rows = (await pg.dataSource.query(
      `INSERT INTO users (display_name) VALUES ('Ada') RETURNING id`,
    )) as Array<{ id: string }>
    userId = rows[0]!.id
  }, 120_000)

  afterAll(async () => {
    // Shared embedded Postgres stays up for other suites.
  })

  it('keeps a token valid on a new model instance and stores only hashes', async () => {
    const first = createPostgresOAuthServerModel(pg.dataSource)
    const oauth = serverFor(first)
    const client = await oauth.registerClient({
      client_name: 'Loopback',
      redirect_uris: ['http://127.0.0.1/callback'],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    })
    const code = 'plain-auth-code'
    await first.saveAuthorizationCode(
      {
        authorizationCode: code,
        clientId: client.client_id,
        userId,
        redirectUri: 'http://127.0.0.1/callback',
        codeChallenge: 'challenge',
        scopes: ['profile:read'],
        expiresAt: new Date(Date.now() + 60_000),
        resource: MCP_RESOURCE_URL,
        grantId: '11111111-1111-4111-8111-111111111111',
      },
      client,
    )
    const consumed = await first.consumeAuthorizationCode(code, client.client_id)
    expect(consumed?.userId).toBe(userId)
    expect(await first.consumeAuthorizationCode(code, client.client_id)).toBeUndefined()

    const rawToken = 'plain-access-token'
    await first.saveAccessToken(
      {
        token: rawToken,
        clientId: client.client_id,
        userId,
        scopes: ['profile:read'],
        expiresAt: new Date(Date.now() + 60_000),
        resource: MCP_RESOURCE_URL,
        grantId: '11111111-1111-4111-8111-111111111111',
      },
      client,
    )
    const restarted = serverFor(createPostgresOAuthServerModel(pg.dataSource))
    const verified = await restarted.verifyAccessToken(rawToken)
    expect(verified.userId).toBe(userId)

    const expired = 'plain-expired-token'
    await first.saveAccessToken(
      {
        token: expired,
        clientId: client.client_id,
        userId,
        scopes: ['profile:read'],
        expiresAt: new Date(Date.now() - 60_000),
        resource: MCP_RESOURCE_URL,
        grantId: '22222222-2222-4222-8222-222222222222',
      },
      client,
    )
    await expect(restarted.verifyAccessToken(expired)).rejects.toThrow(/expir/i)

    const hashes = (await pg.dataSource.query(
      `SELECT token_hash AS value FROM oauth_access_tokens
       UNION ALL SELECT code_hash FROM oauth_authorization_codes`,
    )) as Array<{ value: string }>
    const plaintext = [rawToken, expired, code]
    for (const row of hashes) {
      expect(plaintext).not.toContain(row.value)
      expect(row.value).toBe(createHash('sha256').update(
        plaintext.find((value) => createHash('sha256').update(value).digest('hex') === row.value) ?? '',
      ).digest('hex') || row.value)
      for (const secret of plaintext) {
        expect(row.value.includes(secret)).toBe(false)
      }
    }
  })
})
