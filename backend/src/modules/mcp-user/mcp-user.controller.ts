import { All, Controller, Get, Inject, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { registerUserMcpServer } from './mcp-user-tools'
import {
  authorizationServerMetadata,
  insufficientScopeChallenge,
  MCP_RESOURCE_URL,
  MCP_TOOL_SCOPES,
  protectedResourceMetadata,
  unauthenticatedChallenge,
} from './mcp-oauth.metadata'
import { MCP_TOKEN_VERIFIER, type McpTokenVerifier } from './mcp-token-verifier'

@Controller()
export class McpUserController {
  constructor(@Inject(MCP_TOKEN_VERIFIER) private readonly tokens: McpTokenVerifier) {}

  @Get('.well-known/oauth-protected-resource')
  resourceMetadataRoot() {
    return protectedResourceMetadata()
  }

  @Get('.well-known/oauth-protected-resource/mcp/user')
  resourceMetadataPath() {
    return protectedResourceMetadata()
  }

  @Get('.well-known/oauth-authorization-server')
  serverMetadata() {
    return authorizationServerMetadata()
  }

  @All('mcp/user')
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (Object.prototype.hasOwnProperty.call(req.query, 'access_token')) {
      res.status(400).json({ error: 'invalid_request' })
      return
    }
    const header = req.headers.authorization
    const token = readBearer(header)
    if (!token) {
      res.setHeader('WWW-Authenticate', unauthenticatedChallenge())
      res.status(401).json(rpc('invalid_token'))
      return
    }
    let verified
    try {
      verified = await this.tokens.verifyAccessToken(token)
    } catch {
      res.setHeader('WWW-Authenticate', unauthenticatedChallenge())
      res.status(401).json(rpc('invalid_token'))
      return
    }
    const now = Math.floor(Date.now() / 1000)
    if (verified.expiresAt < now || verified.resource !== MCP_RESOURCE_URL) {
      res.setHeader('WWW-Authenticate', unauthenticatedChallenge())
      res.status(401).json(rpc('invalid_token'))
      return
    }
    const missing = missingScopes(req.body)
    if (missing.length > 0 && !missing.every((scope) => verified.scopes.includes(scope))) {
      const absent = missing.filter((scope) => !verified.scopes.includes(scope))
      res.setHeader('WWW-Authenticate', insufficientScopeChallenge(absent))
      res.status(403).json(rpc('insufficient_scope'))
      return
    }
    await this.dispatch(req, res, verified.userId)
  }

  private async dispatch(req: Request, res: Response, userId: string): Promise<void> {
    const server = new McpServer({ name: 'codequest-user', version: '1.0.0' })
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    registerUserMcpServer(server, userId)
    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch {
      if (!res.headersSent) res.status(500).json(rpc('catalog_unavailable'))
    }
  }
}

function readBearer(header: string | undefined): string | null {
  if (!header) return null
  const [scheme, value] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null
  return value
}

function missingScopes(body: unknown): string[] {
  if (!body || typeof body !== 'object') return []
  const method = (body as { method?: unknown }).method
  if (method !== 'tools/call') return []
  const name = (body as { params?: { name?: unknown } }).params?.name
  if (typeof name !== 'string') return []
  return [...(MCP_TOOL_SCOPES[name] ?? [])]
}

function rpc(message: string) {
  return { jsonrpc: '2.0', id: null, error: { code: -32001, message } }
}
