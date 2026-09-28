import { describe, expect, it } from 'vitest'
import { mcpDocumentation } from './mcp-documentation'

describe('mcpDocumentation', () => {
  it('returns the guide an editor can follow without opening the website', () => {
    const doc = mcpDocumentation()

    expect(doc.title).toMatch(/conectar/i)
    expect(doc.markdown).toContain('codequest-cuenta')
    expect(doc.markdown).toContain('codequest-catalogo')
    expect(doc.markdown).toContain('generate_learning_path')
    expect(doc.markdown).toContain('get_documentation')
    expect(doc.markdown).toContain('En vivo')
    expect(doc.public_tools).toContain('get_documentation')
    expect(doc.public_tools).toContain('search_courses')
    expect(doc.user_tools).toContain('save_learning_path')
  })
})
