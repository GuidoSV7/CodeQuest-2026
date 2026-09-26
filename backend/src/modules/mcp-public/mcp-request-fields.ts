export function mcpRequestFields(body: unknown): { rpcMethod: string; tool?: string } {
  if (!body || typeof body !== 'object') return { rpcMethod: 'unknown' }
  const record = body as { method?: unknown; params?: { name?: unknown } }
  const rpcMethod = typeof record.method === 'string' ? record.method : 'unknown'
  const name = record.params?.name
  if (typeof name !== 'string') return { rpcMethod }
  return { rpcMethod, tool: name }
}
