const LOCAL_DEV_ORIGINS = new Set(['http://localhost:3000', 'http://127.0.0.1:3000'])

/** Attach the session JWT in the fragment when the browser is the local dev app. */
export function sessionHandoffUrl(redirectUrl: string, token: string): string {
  const url = new URL(redirectUrl)
  if (!LOCAL_DEV_ORIGINS.has(url.origin)) return redirectUrl
  url.hash = `cq_session=${encodeURIComponent(token)}`
  return url.toString()
}
