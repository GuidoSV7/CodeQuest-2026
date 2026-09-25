import { describe, expect, it, vi } from 'vitest'
import { OAuthServer, MemoryOAuthServerModel } from 'mcp-oauth-server'
import { createCimdFetch } from './cimd-fetch'
import { MCP_ISSUER_URL, MCP_RESOURCE_URL, MCP_SCOPES } from './mcp-oauth.metadata'

const DOCUMENT = 'https://client.example/oauth/client.json'

function documentResponse() {
  return new Response(
    JSON.stringify({
      client_id: DOCUMENT,
      client_name: 'Example',
      redirect_uris: ['https://client.example/callback'],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
    }),
    { status: 200, headers: { 'content-type': 'application/json', 'content-length': '120' } },
  )
}

describe('CIMD fetch SSRF guard', () => {
  it('rejects http, private, loopback, link-local, and hostnames that resolve there', async () => {
    const inner = vi.fn(async () => documentResponse())
    const lookup = vi.fn(async (hostname: string) => {
      if (hostname === 'public.example') return ['1.1.1.1']
      if (hostname === 'rebind.example') return ['1.1.1.1', '127.0.0.1']
      return ['192.168.1.20']
    })
    const guarded = createCimdFetch({ fetch: inner, lookup, timeoutMs: 50, maxBytes: 1024 })

    await expect(guarded('http://public.example/oauth/client.json')).rejects.toThrow(/https/i)
    await expect(guarded('https://10.0.0.5/oauth/client.json')).rejects.toThrow(/host/i)
    await expect(guarded('https://127.0.0.1/oauth/client.json')).rejects.toThrow(/host/i)
    await expect(guarded('https://169.254.169.254/latest')).rejects.toThrow(/host/i)
    await expect(guarded('https://rebind.example/oauth/client.json')).rejects.toThrow(/host/i)
    await expect(guarded('https://intranet.example/oauth/client.json')).rejects.toThrow(/host/i)
    expect(inner).not.toHaveBeenCalled()

    await guarded('https://public.example/oauth/client.json')
    expect(inner).toHaveBeenCalledTimes(1)
    const init = inner.mock.calls[0]?.[1] as RequestInit
    expect(init.redirect).toBe('error')
  })

  it('stops an oversized document and a fetch that ignores the timeout', async () => {
    const huge = vi.fn(
      async () => new Response('x', { status: 200, headers: { 'content-length': '99999' } }),
    )
    const guarded = createCimdFetch({
      fetch: huge,
      lookup: async () => ['1.1.1.1'],
      timeoutMs: 50,
      maxBytes: 1024,
    })
    await expect(guarded('https://public.example/oauth/client.json')).rejects.toThrow(/large|size/i)

    const hanging = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        }),
    )
    const slow = createCimdFetch({
      fetch: hanging as typeof fetch,
      lookup: async () => ['1.1.1.1'],
      timeoutMs: 30,
      maxBytes: 1024,
    })
    await expect(slow('https://public.example/oauth/client.json')).rejects.toThrow(/abort/i)
  })

  it('does not fetch a metadata URL whose hostname resolves to a private address', async () => {
    const inner = vi.fn(async () => documentResponse())
    const oauth = new OAuthServer({
      model: new MemoryOAuthServerModel(),
      issuerUrl: new URL(MCP_ISSUER_URL),
      resourceServerUrl: new URL(MCP_RESOURCE_URL),
      authorizationUrl: new URL(`${MCP_ISSUER_URL}/oauth/consent`),
      scopesSupported: [...MCP_SCOPES],
      dynamicClientRegistration: true,
      clientIdMetadataDocuments: {
        fetch: createCimdFetch({
          fetch: inner,
          lookup: async () => ['10.1.2.3'],
          timeoutMs: 50,
        }),
        fetchTimeoutMs: 50,
      },
    })
    await expect(oauth.getClient(DOCUMENT)).rejects.toThrow(/host|fetch|trust|invalid/i)
    expect(inner).not.toHaveBeenCalled()
  })
})
