import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const README = path.resolve(process.cwd(), 'README.md')
const MCP_URL = 'https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io/mcp'

describe('MCP connection docs', () => {
  const readme = readFileSync(README, 'utf8')

  it('documents Claude.ai, Claude Code and Cursor with the public URL', () => {
    expect(readme).toContain('Ajustes → Conectores → Agregar conector personalizado')
    expect(readme).toContain(`claude mcp add --transport http codequest ${MCP_URL}`)
    expect(readme).toContain('"mcpServers"')
    expect(readme).toContain(`"url": "${MCP_URL}"`)
    expect(readme).toContain('Autenticación: ninguna')
  })
})
