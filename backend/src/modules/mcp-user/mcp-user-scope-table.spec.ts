import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RequestMethod, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { McpUserModule } from './mcp-user.module'
import { MCP_TOKEN_VERIFIER, type McpTokenVerifier } from './mcp-token-verifier'
import {
  insufficientScopeChallenge,
  MCP_RESOURCE_URL,
  MCP_TOOL_SCOPES,
} from './mcp-oauth.metadata'

const USER_TOOLS = [
  { name: 'get_my_profile', scopes: ['profile:read'] },
  { name: 'list_my_paths', scopes: ['paths:read'] },
  { name: 'get_my_path', scopes: ['paths:read', 'progress:read'] },
  { name: 'save_learning_path', scopes: ['paths:write'] },
  { name: 'update_course_progress', scopes: ['progress:write'] },
] as const

const PUBLIC_TOOLS = [
  'search_courses',
  'get_course',
  'list_official_paths',
  'get_official_path',
  'generate_learning_path',
] as const

describe('MCP user tool scopes', () => {
  let app: INestApplication
  let baseUrl: string

  beforeAll(async () => {
    const verifier: McpTokenVerifier = {
      async verifyAccessToken(token: string) {
        if (token !== 'no-scopes') throw new Error('unknown_token')
        return {
          userId: '11111111-1111-4111-8111-111111111111',
          scopes: [],
          resource: MCP_RESOURCE_URL,
          expiresAt: Math.floor(Date.now() / 1000) + 600,
        }
      },
    }
    const moduleRef = await Test.createTestingModule({ imports: [McpUserModule] })
      .overrideProvider(MCP_TOKEN_VERIFIER)
      .useValue(verifier)
      .compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'mcp/user', method: RequestMethod.ALL }],
    })
    await app.listen(0)
    const address = app.getHttpServer().address()
    const port = typeof address === 'object' && address ? address.port : 0
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    const server = app?.getHttpServer() as { closeAllConnections?: () => void } | undefined
    server?.closeAllConnections?.()
    await app?.close()
  })

  async function call(name: string) {
    return fetch(`${baseUrl}/mcp/user`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer no-scopes',
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name, arguments: {} },
      }),
    })
  }

  it.each(USER_TOOLS)('$name without $scopes returns 403 insufficient_scope', async ({ name, scopes }) => {
    expect(MCP_TOOL_SCOPES[name]).toEqual([...scopes])
    const response = await call(name)
    expect(response.status).toBe(403)
    const body = (await response.json()) as { error?: { message?: string } }
    expect(body.error?.message).toBe('insufficient_scope')
    expect(response.headers.get('www-authenticate')).toBe(insufficientScopeChallenge([...scopes]))
  })

  it.each(PUBLIC_TOOLS)('$name has no user scope and is not rejected as insufficient_scope', async (name) => {
    expect(MCP_TOOL_SCOPES[name]).toBeUndefined()
    const response = await call(name)
    expect(response.status).not.toBe(403)
    expect(response.headers.get('www-authenticate') ?? '').not.toContain('insufficient_scope')
  })
})
