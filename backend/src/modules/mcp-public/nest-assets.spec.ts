import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Nest build assets', () => {
  it('copies path-aliases.json next to the compiled MCP module', () => {
    const config = JSON.parse(readFileSync(path.resolve(process.cwd(), 'nest-cli.json'), 'utf8')) as {
      compilerOptions: { assets: Array<{ include: string }> }
    }
    const includes = config.compilerOptions.assets.map((asset) => asset.include)
    expect(includes).toContain('modules/mcp-public/path-aliases.json')
  })
})
