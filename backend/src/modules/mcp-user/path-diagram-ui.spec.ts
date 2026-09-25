import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it } from 'vitest'
import { registerUserMcpServer } from './mcp-user-tools'

describe('user MCP path diagram resource', () => {
  it('lists get_my_path with the ui resource and reads the html', async () => {
    const server = new McpServer({ name: 'codequest-user', version: '1.0.0' })
    registerUserMcpServer(server, '11111111-1111-4111-8111-111111111111')
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'diagram-test', version: '0.0.0' })
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
    const listed = await client.listTools()
    const tool = listed.tools.find((item) => item.name === 'get_my_path')
    expect(tool?._meta).toMatchObject({
      ui: { resourceUri: 'ui://codequest/path-diagram.html' },
    })
    const read = await client.readResource({ uri: 'ui://codequest/path-diagram.html' })
    const content = read.contents[0]
    expect(content).toMatchObject({ mimeType: 'text/html;profile=mcp-app' })
    if (content && 'text' in content && typeof content.text === 'string') {
      expect(content.text).not.toMatch(/https?:\/\/(?!www\.w3\.org\/(?:2000\/svg|1999\/xlink))/)
    }
    await client.close()
    await server.close()
  })
})
