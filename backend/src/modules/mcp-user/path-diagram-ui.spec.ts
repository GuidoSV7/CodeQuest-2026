import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it } from 'vitest'
import { registerUserMcpServer } from './mcp-user-tools'

describe('user MCP tools list', () => {
  it('does not advertise the MCP App widget', async () => {
    const server = new McpServer({ name: 'codequest-user', version: '1.0.0' })
    registerUserMcpServer(server, '11111111-1111-4111-8111-111111111111')
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'diagram-test', version: '0.0.0' })
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
    const listed = await client.listTools()
    for (const tool of listed.tools) {
      expect(tool._meta?.ui).toBeUndefined()
      expect(tool.inputSchema).toBeTruthy()
    }
    await expect(client.listResources()).rejects.toThrow()
    await client.close()
    await server.close()
  })
})
