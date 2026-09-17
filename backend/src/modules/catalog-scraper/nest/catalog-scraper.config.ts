import type { HttpFetcher } from '../ports/http-client.port'

/** Adaptador del `fetch` global de Node a la port `HttpFetcher` del scraper. */
export const globalFetchFetcher: HttpFetcher = async (url, init) => {
  const res = await fetch(url, { headers: init.headers, signal: init.signal })
  const body = await res.text()
  return { status: res.status, body }
}
