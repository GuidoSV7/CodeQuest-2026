export type HttpGetResult = {
  status: number
  body: string
}

export type HttpFetcher = (
  url: string,
  init: {
    headers: Record<string, string>
    signal?: AbortSignal
  },
) => Promise<HttpGetResult>

/** Port: injectable HTTP GET with resilience. */
export type HttpClient = {
  getText(url: string): Promise<string>
}

export const HTTP_CLIENT = Symbol('HTTP_CLIENT')
