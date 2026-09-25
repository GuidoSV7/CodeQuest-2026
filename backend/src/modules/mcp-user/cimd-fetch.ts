import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

const MAX_CIMD_BYTES = 10 * 1024
const CIMD_TIMEOUT_MS = 1_500

const blocked = new BlockList()
blocked.addSubnet('0.0.0.0', 8, 'ipv4')
blocked.addSubnet('10.0.0.0', 8, 'ipv4')
blocked.addSubnet('127.0.0.0', 8, 'ipv4')
blocked.addSubnet('169.254.0.0', 16, 'ipv4')
blocked.addSubnet('172.16.0.0', 12, 'ipv4')
blocked.addSubnet('192.168.0.0', 16, 'ipv4')
blocked.addAddress('::1', 'ipv6')
blocked.addSubnet('fc00::', 7, 'ipv6')
blocked.addSubnet('fe80::', 10, 'ipv6')

export type CimdLookup = (hostname: string) => Promise<string[]>

export const MCP_CIMD_LOOKUP = 'MCP_CIMD_LOOKUP'

type CimdFetchOptions = {
  fetch?: typeof fetch
  lookup?: CimdLookup
  timeoutMs?: number
  maxBytes?: number
}

export function createCimdFetch(options: CimdFetchOptions = {}): typeof fetch {
  const inner = options.fetch ?? globalThis.fetch.bind(globalThis)
  const resolve = options.lookup ?? defaultLookup
  const timeoutMs = options.timeoutMs ?? CIMD_TIMEOUT_MS
  const maxBytes = options.maxBytes ?? MAX_CIMD_BYTES

  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    if (url.protocol !== 'https:') throw new Error('CIMD requires https')
    if (isBlockedHost(url.hostname)) throw new Error('CIMD host is not allowed')
    const addresses = await resolve(url.hostname)
    if (addresses.length === 0 || addresses.some((address) => isBlockedAddress(address))) {
      throw new Error('CIMD host is not allowed')
    }
    const timeout = AbortSignal.timeout(timeoutMs)
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
    const response = await inner(url, { ...init, redirect: 'error', signal })
    const length = Number(response.headers.get('content-length') ?? '0')
    if (Number.isFinite(length) && length > maxBytes) throw new Error('CIMD document is too large')
    if (response.status >= 300 && response.status < 400) throw new Error('CIMD redirect is not allowed')
    return response
  }
}

async function defaultLookup(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname]
  const records = await lookup(hostname, { all: true, verbatim: true })
  return records.map((record) => record.address)
}

function isBlockedHost(hostname: string): boolean {
  const bare = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (bare === 'localhost' || bare.endsWith('.localhost')) return true
  return isBlockedAddress(bare)
}

function isBlockedAddress(address: string): boolean {
  const mapped = address.toLowerCase().startsWith('::ffff:') ? address.slice(7) : address
  if (!isIP(mapped)) return false
  const family = mapped.includes(':') ? 'ipv6' : 'ipv4'
  return blocked.check(mapped, family)
}
