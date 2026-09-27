/** Production frontend, plus localhost so the local dev app can read the API with the session cookie. */
export function credentialCorsOrigin(requestOrigin: string | undefined, frontendUrl: string): boolean {
  if (!requestOrigin || requestOrigin === frontendUrl) return true
  try {
    const host = new URL(requestOrigin).hostname
    return host === 'localhost' || host === '127.0.0.1'
  } catch {
    return false
  }
}
