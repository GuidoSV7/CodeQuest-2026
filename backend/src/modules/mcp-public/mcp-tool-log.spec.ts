import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { McpToolError } from './catalog-read'
import { runMcpTool } from './mcp-tool-log'

describe('runMcpTool', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs a completed tool without the arguments', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined)
    await runMcpTool({ surface: 'public', tool: 'search_courses' }, async () => ({ courses: ['secret-goal'] }))
    const fields = log.mock.calls[0]?.[0] as Record<string, unknown>
    expect(fields.event).toBe('mcp_tool_completed')
    expect(fields.tool).toBe('search_courses')
    expect(JSON.stringify(fields)).not.toContain('secret-goal')
  })

  it('logs an expected rejection and still returns that error to the client', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const result = await runMcpTool({ surface: 'public', tool: 'get_course' }, async () => {
      throw new McpToolError('not_found')
    })
    expect(result).toMatchObject({ isError: true, content: [{ text: 'not_found' }] })
    expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'mcp_tool_rejected', reason: 'not_found' })
  })

  it('logs an unexpected failure as internal_error and keeps the ref in the log', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const result = await runMcpTool({ surface: 'public', tool: 'generate_learning_path' }, async () => {
      throw new Error('ENOENT: path-aliases.json')
    })
    const text = (result as { content: { text: string }[] }).content[0]?.text ?? ''
    expect(text).toMatch(/^internal_error \(ref: [0-9a-f]+\)/)
    expect(text).not.toMatch(/path-aliases/)
    expect(text).toContain('reintentar')
    const ref = text.match(/ref: ([0-9a-f]+)/)?.[1]
    expect(error.mock.calls[0]?.[0]).toMatchObject({
      event: 'mcp_tool_failed',
      ref,
      result: 'internal_error',
      server: '/mcp',
      err: { type: 'Error', message: 'ENOENT: path-aliases.json', stack: expect.stringContaining('Error') },
    })
  })

  it('keeps catalog_unavailable only for a catalog read failure and logs that ref', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const { McpToolError } = await import('./catalog-read')
    const result = await runMcpTool({ surface: 'user', tool: 'generate_learning_path' }, async () => {
      throw new McpToolError('catalog_unavailable')
    })
    const text = (result as { content: { text: string }[] }).content[0]?.text ?? ''
    expect(text).toBe('catalog_unavailable')
    expect(warn.mock.calls.at(-1)?.[0]).toMatchObject({
      event: 'mcp_tool_rejected',
      result: 'catalog_unavailable',
      server: '/mcp/user',
      reason: 'catalog_unavailable',
    })
  })
})
