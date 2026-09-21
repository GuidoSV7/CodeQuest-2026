export const DISCORD_OAUTH_CLIENT = Symbol('DISCORD_OAUTH_CLIENT')
export const SESSION_JWT = Symbol('SESSION_JWT')
export const AUTH_SERVICE = Symbol('AUTH_SERVICE')
export const AUTH_COOKIE_OPTIONS = Symbol('AUTH_COOKIE_OPTIONS')

export type AuthCookieOptions = {
  name: string
  maxAgeSeconds: number
  secure: boolean
  /** `none` required for cross-site FE↔API (e.g. localhost → Dokploy). */
  sameSite: 'lax' | 'none'
  httpOnly: true
  path: '/'
}
