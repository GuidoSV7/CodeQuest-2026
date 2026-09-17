import { describe, expect, it, vi } from 'vitest'
import { HttpRequestError } from '../../domain/catalog'
import { createFetchHttpClient } from './fetch-http-client'
import type { HttpFetcher } from '../../ports/http-client.port'

describe('FetchHttpClient', () => {
  it('returns body on 200 and sends configured User-Agent', async () => {
    const fetcher = vi.fn<HttpFetcher>(async (_url, init) => {
      expect(init.headers['User-Agent']).toContain('Chrome')
      return { status: 200, body: '<html>ok</html>' }
    })

    const client = createFetchHttpClient({
      fetcher,
      userAgent: 'Mozilla/5.0 Chrome/131',
      timeoutMs: 1000,
      maxRetries: 0,
      backoffBaseMs: 1,
      maxConcurrency: 2,
      minIntervalMs: 0,
      sleep: async () => undefined,
    })

    await expect(client.getText('https://example.com')).resolves.toBe(
      '<html>ok</html>',
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('retries on 5xx with exponential backoff then succeeds', async () => {
    const sleeps: number[] = []
    const fetcher = vi
      .fn<HttpFetcher>()
      .mockResolvedValueOnce({ status: 503, body: 'no' })
      .mockResolvedValueOnce({ status: 502, body: 'no' })
      .mockResolvedValueOnce({ status: 200, body: 'yes' })

    const client = createFetchHttpClient({
      fetcher,
      userAgent: 'ua',
      timeoutMs: 1000,
      maxRetries: 3,
      backoffBaseMs: 10,
      maxConcurrency: 1,
      minIntervalMs: 0,
      sleep: async (ms) => {
        sleeps.push(ms)
      },
    })

    await expect(client.getText('https://example.com/x')).resolves.toBe('yes')
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(sleeps[0]).toBe(10)
    expect(sleeps[1]).toBe(20)
  })

  it('does not retry on 4xx', async () => {
    const fetcher = vi.fn<HttpFetcher>(async () => ({
      status: 404,
      body: 'missing',
    }))

    const client = createFetchHttpClient({
      fetcher,
      userAgent: 'ua',
      timeoutMs: 1000,
      maxRetries: 3,
      backoffBaseMs: 10,
      maxConcurrency: 1,
      minIntervalMs: 0,
      sleep: async () => undefined,
    })

    await expect(client.getText('https://example.com/404')).rejects.toBeInstanceOf(
      HttpRequestError,
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('retries on network errors', async () => {
    const fetcher = vi
      .fn<HttpFetcher>()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ status: 200, body: 'recovered' })

    const client = createFetchHttpClient({
      fetcher,
      userAgent: 'ua',
      timeoutMs: 1000,
      maxRetries: 2,
      backoffBaseMs: 5,
      maxConcurrency: 1,
      minIntervalMs: 0,
      sleep: async () => undefined,
    })

    await expect(client.getText('https://example.com')).resolves.toBe(
      'recovered',
    )
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('respects max concurrency', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const fetcher = vi.fn<HttpFetcher>(async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((r) => setTimeout(r, 30))
      inFlight -= 1
      return { status: 200, body: 'ok' }
    })

    const client = createFetchHttpClient({
      fetcher,
      userAgent: 'ua',
      timeoutMs: 2000,
      maxRetries: 0,
      backoffBaseMs: 1,
      maxConcurrency: 2,
      minIntervalMs: 0,
      sleep: async () => undefined,
    })

    await Promise.all([
      client.getText('https://example.com/1'),
      client.getText('https://example.com/2'),
      client.getText('https://example.com/3'),
      client.getText('https://example.com/4'),
    ])

    expect(maxInFlight).toBeLessThanOrEqual(2)
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('aborts when timeout elapses', async () => {
    const fetcher = vi.fn<HttpFetcher>(async (_url, init) => {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => resolve(), 500)
        init.signal?.addEventListener('abort', () => {
          clearTimeout(t)
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        })
      })
      return { status: 200, body: 'late' }
    })

    const client = createFetchHttpClient({
      fetcher,
      userAgent: 'ua',
      timeoutMs: 20,
      maxRetries: 0,
      backoffBaseMs: 1,
      maxConcurrency: 1,
      minIntervalMs: 0,
      sleep: async () => undefined,
    })

    await expect(client.getText('https://example.com/slow')).rejects.toThrow()
  })
})
