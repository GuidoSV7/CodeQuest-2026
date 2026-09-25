import type { Request } from 'express'
import type { SessionJwt } from '../identity/infrastructure/session-jwt'
import type { ConsentUser } from './mount-mcp-authorization'

let resolveConsentUser: ConsentUser = async () => ''

/** Reads the session cookie the Discord callback just set, including the raw header. */
export function readCookieValue(req: Request, name: string): string {
  const parsed = req.cookies as Record<string, unknown> | undefined
  const fromParser = parsed?.[name]
  if (typeof fromParser === 'string' && fromParser) return fromParser
  const header = req.headers.cookie
  if (!header) return ''
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq <= 0 || trimmed.slice(0, eq) !== name) continue
    const raw = trimmed.slice(eq + 1)
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  return ''
}

export function createSessionConsentUser(
  sessionJwt: SessionJwt,
  cookieName: string,
): ConsentUser {
  return async (req) => {
    const token = readCookieValue(req, cookieName)
    if (!token) return ''
    try {
      const claims = await sessionJwt.verify(token)
      return claims.sub
    } catch {
      return ''
    }
  }
}

export function installSessionConsentUser(user: ConsentUser): void {
  resolveConsentUser = user
}

export const sessionConsentUser: ConsentUser = (req) => resolveConsentUser(req)
