import { randomBytes } from 'node:crypto'
import { Logger } from '@nestjs/common'
import { McpToolError } from './catalog-read'

const logger = new Logger('McpTools')

type ToolMeta = {
  surface: 'public' | 'user'
  tool: string
  userId?: string
}

type ToolPayload = {
  isError?: boolean
  content?: { type: string; text?: string }[]
}

export function briefError(error: unknown): { type: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { type: error.name, message: error.message, stack: error.stack }
  }
  return { type: 'UnknownError', message: String(error) }
}

function serverOf(surface: ToolMeta['surface']): '/mcp' | '/mcp/user' {
  return surface === 'public' ? '/mcp' : '/mcp/user'
}

function newRef(): string {
  return randomBytes(3).toString('hex')
}

export function logMcpSwallowed(meta: ToolMeta, error: unknown): void {
  logger.warn(
    {
      event: 'mcp_tool_swallowed',
      tool: meta.tool,
      server: serverOf(meta.surface),
      ref: newRef(),
      err: briefError(error),
    },
    'MCP tool swallowed an error',
  )
}

function rejectionReason(result: ToolPayload): string | undefined {
  const text = result.content?.find((item) => item.type === 'text')?.text
  if (!text || text.length > 80) return undefined
  return text
}

function failureResult(reason: string) {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: reason }],
  }
}

export function internalErrorText(error: unknown, fields: Record<string, unknown>): string {
  const ref = newRef()
  logger.error(
    {
      ...fields,
      event: 'mcp_tool_failed',
      ref,
      result: 'internal_error',
      err: briefError(error),
    },
    'MCP tool failed',
  )
  return `internal_error (ref: ${ref}). Error del servidor. Podés reintentar.`
}

export async function runMcpTool<T>(meta: ToolMeta, work: () => Promise<T>): Promise<T> {
  const started = Date.now()
  const server = serverOf(meta.surface)
  const base = { tool: meta.tool, server, userId: meta.userId }
  try {
    const result = await work()
    const payload = result as ToolPayload
    const durationMs = Date.now() - started
    if (payload && typeof payload === 'object' && payload.isError) {
      const reason = rejectionReason(payload)
      logger.warn(
        {
          event: 'mcp_tool_rejected',
          ...base,
          durationMs,
          ref: newRef(),
          result: reason ?? 'error',
          reason,
        },
        'MCP tool rejected',
      )
      return result
    }
    logger.log(
      {
        event: 'mcp_tool_completed',
        ...base,
        durationMs,
        ref: newRef(),
        result: 'ok',
      },
      'MCP tool completed',
    )
    return result
  } catch (error) {
    const durationMs = Date.now() - started
    if (error instanceof McpToolError) {
      logger.warn(
        {
          event: 'mcp_tool_rejected',
          ...base,
          durationMs,
          ref: newRef(),
          result: error.message,
          reason: error.message,
          err: briefError(error),
        },
        'MCP tool rejected',
      )
      return failureResult(error.message) as T
    }
    const text = internalErrorText(error, { ...base, durationMs })
    return failureResult(text) as T
  }
}
