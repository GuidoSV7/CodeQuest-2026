import { HttpRequestError } from '../../domain/catalog'
import type { HttpClient, HttpFetcher } from '../../ports/http-client.port'

export type FetchHttpClientOptions = {
  fetcher: HttpFetcher
  userAgent: string
  timeoutMs: number
  maxRetries: number
  backoffBaseMs: number
  maxConcurrency: number
  minIntervalMs: number
  sleep?: (ms: number) => Promise<void>
}

export function createFetchHttpClient(
  options: FetchHttpClientOptions,
): HttpClient {
  const sleep = options.sleep ?? defaultSleep
  const queue = createConcurrencyLimiter(options.maxConcurrency)
  let nextSlot = 0

  return {
    async getText(url: string): Promise<string> {
      return queue(async () => {
        if (options.minIntervalMs > 0) {
          const now = Date.now()
          const wait = Math.max(0, nextSlot - now)
          nextSlot = Math.max(now, nextSlot) + options.minIntervalMs
          if (wait > 0) await sleep(wait)
        }

        let attempt = 0
        // attempt 0..maxRetries inclusive tries
        while (true) {
          try {
            const body = await once(url, options, sleep)
            return body
          } catch (err) {
            const retryable =
              err instanceof HttpRequestError
                ? err.retryable
                : isNetworkError(err)
            if (!retryable || attempt >= options.maxRetries) {
              throw err
            }
            const delay = options.backoffBaseMs * 2 ** attempt
            attempt += 1
            await sleep(delay)
          }
        }
      })
    },
  }
}

async function once(
  url: string,
  options: FetchHttpClientOptions,
  _sleep: (ms: number) => Promise<void>,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs)

  try {
    const result = await options.fetcher(url, {
      headers: {
        'User-Agent': options.userAgent,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      signal: controller.signal,
    })

    if (result.status >= 200 && result.status < 300) {
      return result.body
    }

    const retryable = result.status >= 500 && result.status <= 599
    throw new HttpRequestError(
      `HTTP ${result.status} for ${url}`,
      result.status,
      retryable,
    )
  } catch (err) {
    if (err instanceof HttpRequestError) throw err
    if (isAbortError(err)) {
      throw new HttpRequestError(`Timeout after ${options.timeoutMs}ms for ${url}`, undefined, true)
    }
    throw new HttpRequestError(
      err instanceof Error ? err.message : String(err),
      undefined,
      true,
    )
  } finally {
    clearTimeout(timer)
  }
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'AbortError'
  )
}

function isNetworkError(err: unknown): boolean {
  return err instanceof Error
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createConcurrencyLimiter(max: number) {
  let active = 0
  const waiters: Array<() => void> = []

  const acquire = () =>
    new Promise<void>((resolve) => {
      if (active < max) {
        active += 1
        resolve()
        return
      }
      waiters.push(() => {
        active += 1
        resolve()
      })
    })

  const release = () => {
    active -= 1
    const next = waiters.shift()
    if (next) next()
  }

  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    await acquire()
    try {
      return await fn()
    } finally {
      release()
    }
  }
}
