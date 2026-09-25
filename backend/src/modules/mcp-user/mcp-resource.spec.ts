import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RequestMethod, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { McpUserModule } from './mcp-user.module'
import { MCP_TOKEN_VERIFIER, type McpTokenVerifier } from './mcp-token-verifier'

const ISSUER = 'https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io'
const RESOURCE = `${ISSUER}/mcp/user`
const RESOURCE_METADATA = `${ISSUER}/.well-known/oauth-protected-resource/mcp/user`
const SCOPES = [
  'profile:read',
  'paths:read',
  'paths:write',
  'progress:read',
  'progress:write',
]

const UNAUTHENTICATED = `Bearer resource_metadata="${RESOURCE_METADATA}", scope="${SCOPES.join(' ')}"`

const RESOURCE_METADATA_BODY = {
  resource: RESOURCE,
  authorization_servers: [ISSUER],
  scopes_supported: SCOPES,
  bearer_methods_supported: ['header'],
  resource_name: 'CodeQuest',
}

const AS_METADATA_BODY = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/authorize`,
  token_endpoint: `${ISSUER}/token`,
  registration_endpoint: `${ISSUER}/register`,
  revocation_endpoint: `${ISSUER}/revoke`,
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
  revocation_endpoint_auth_methods_supported: ['none'],
  client_id_metadata_document_supported: true,
  authorization_response_iss_parameter_supported: true,
  scopes_supported: SCOPES,
}

function verifier(tokens: Record<string, { scopes: string[]; resource: string; expiresAt: number; userId: string }>): McpTokenVerifier {
  return {
    async verifyAccessToken(token: string) {
      const row = tokens[token]
      if (!row) {
        throw new Error('unknown_token')
      }
      return row
    },
  }
}

describe('MCP user resource server', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [McpUserModule],
    })
      .overrideProvider(MCP_TOKEN_VERIFIER)
      .useValue(
        verifier({
          'good-token': {
            userId: 'user-a',
            scopes: ['profile:read'],
            resource: RESOURCE,
            expiresAt: Math.floor(Date.now() / 1000) + 600,
          },
          'other-audience': {
            userId: 'user-a',
            scopes: SCOPES,
            resource: `${ISSUER}/mcp`,
            expiresAt: Math.floor(Date.now() / 1000) + 600,
          },
          expired: {
            userId: 'user-a',
            scopes: SCOPES,
            resource: RESOURCE,
            expiresAt: Math.floor(Date.now() / 1000) - 10,
          },
        }),
      )
      .compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api', {
      exclude: [
        { path: 'mcp/user', method: RequestMethod.ALL },
        { path: '.well-known/oauth-protected-resource', method: RequestMethod.GET },
        { path: '.well-known/oauth-protected-resource/mcp/user', method: RequestMethod.GET },
        { path: '.well-known/oauth-authorization-server', method: RequestMethod.GET },
      ],
    })
    await app.listen(0)
    const address = app.getHttpServer().address()
    const port = typeof address === 'object' && address ? address.port : 0
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    await app?.close()
  })

  it('serves both protected-resource documents and the authorization server metadata', async () => {
    const root = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`)
    const path = await fetch(`${baseUrl}/.well-known/oauth-protected-resource/mcp/user`)
    const server = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`)
    expect(root.status).toBe(200)
    expect(path.status).toBe(200)
    expect(await root.json()).toEqual(RESOURCE_METADATA_BODY)
    expect(await path.json()).toEqual(RESOURCE_METADATA_BODY)
    expect(server.status).toBe(200)
    expect(await server.json()).toEqual(AS_METADATA_BODY)
    expect(RESOURCE_METADATA_BODY.resource).toBe(RESOURCE)
    expect(RESOURCE.endsWith('/')).toBe(false)
  })

  it('answers 401 with the spec challenge when /mcp/user has no token', async () => {
    const response = await fetch(`${baseUrl}/mcp/user`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
    })
    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toBe(UNAUTHENTICATED)
    const body = await response.text()
    expect(body).not.toMatch(/\n\s+at /)
    expect(body.toLowerCase()).not.toContain('node_modules')
  })

  it('rejects another audience, an expired token, and an unknown token', async () => {
    for (const token of ['other-audience', 'expired', 'not-a-signature']) {
      const response = await fetch(`${baseUrl}/mcp/user`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
      })
      expect(response.status).toBe(401)
      expect(response.headers.get('www-authenticate')).toBe(UNAUTHENTICATED)
      expect(await response.text()).not.toMatch(/\n\s+at /)
    }
  })

  it('returns 403 insufficient_scope when the token lacks the tool scope', async () => {
    const response = await fetch(`${baseUrl}/mcp/user`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: 'Bearer good-token',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'save_learning_path', arguments: {} },
      }),
    })
    expect(response.status).toBe(403)
    expect(response.headers.get('www-authenticate')).toBe(
      `Bearer error="insufficient_scope", scope="paths:write", resource_metadata="${RESOURCE_METADATA}"`,
    )
    expect(await response.text()).not.toMatch(/\n\s+at /)
  })

  it('rejects an access token in the query string', async () => {
    const response = await fetch(`${baseUrl}/mcp/user?access_token=good-token`, { method: 'POST' })
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error?: string }
    expect(body.error).toBe('invalid_request')
  })
})
