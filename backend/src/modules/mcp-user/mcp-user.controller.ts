import { All, Controller, Get, Inject, Logger, Req, Res } from '@nestjs/common'
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
import { internalErrorText } from '../mcp-public/mcp-tool-log'
import { mcpRequestFields } from '../mcp-public/mcp-request-fields'
import { releaseCommit } from '../../release'

@Controller()
export class McpUserController {
  private readonly logger = new Logger(McpUserController.name)

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
    const started = Date.now()
    const fields = { surface: 'user' as const, ...mcpRequestFields(req.body) }
    if (Object.prototype.hasOwnProperty.call(req.query, 'access_token')) {
      this.logger.warn(
        { event: 'mcp_access_token_query_rejected', ...fields },
        'MCP access token in query rejected',
      )
      res.status(400).json({ error: 'invalid_request' })
      return
    }
    const token = readBearer(req.headers.authorization)
    if (!token) {
      this.logger.warn({ event: 'mcp_unauthenticated', ...fields }, 'MCP request unauthenticated')
      res.setHeader('WWW-Authenticate', unauthenticatedChallenge())
      res.status(401).json(rpc('invalid_token'))
      return
    }
    let verified
    try {
      verified = await this.tokens.verifyAccessToken(token)
    } catch {
      this.logger.warn(
        { event: 'mcp_token_rejected', reason: 'verify_failed', ...fields },
        'MCP token rejected',
      )
      res.setHeader('WWW-Authenticate', unauthenticatedChallenge())
      res.status(401).json(rpc('invalid_token'))
      return
    }
    const now = Math.floor(Date.now() / 1000)
    if (verified.expiresAt < now || verified.resource !== MCP_RESOURCE_URL) {
      this.logger.warn(
        {
          event: 'mcp_token_rejected',
          reason: verified.expiresAt < now ? 'expired' : 'resource_mismatch',
          ...fields,
        },
        'MCP token rejected',
      )
      res.setHeader('WWW-Authenticate', unauthenticatedChallenge())
      res.status(401).json(rpc('invalid_token'))
      return
    }
    const missing = missingScopes(req.body)
    if (missing.length > 0 && !missing.every((scope) => verified.scopes.includes(scope))) {
      const absent = missing.filter((scope) => !verified.scopes.includes(scope))
      this.logger.warn(
        { event: 'mcp_insufficient_scope', ...fields, missingScopes: absent, userId: verified.userId },
        'MCP scope rejected',
      )
      res.setHeader('WWW-Authenticate', insufficientScopeChallenge(absent))
      res.status(403).json(rpc('insufficient_scope'))
      return
    }
    this.logger.log(
      { event: 'mcp_request_accepted', ...fields, userId: verified.userId },
      'MCP request accepted',
    )
    try {
      await this.dispatch(req, res, verified.userId)
      this.logger.log(
        {
          event: 'mcp_request_completed',
          ...fields,
          userId: verified.userId,
          durationMs: Date.now() - started,
        },
        'MCP request completed',
      )
    } catch (error) {
      const message = internalErrorText(error, {
        ...fields,
        userId: verified.userId,
        durationMs: Date.now() - started,
      })
      if (!res.headersSent) res.status(500).json(rpc(message))
    }
  }

  private async dispatch(req: Request, res: Response, userId: string): Promise<void> {
    const server = new McpServer({ name: 'codequest-user', version: releaseCommit() })
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    registerUserMcpServer(server, userId)
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
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
