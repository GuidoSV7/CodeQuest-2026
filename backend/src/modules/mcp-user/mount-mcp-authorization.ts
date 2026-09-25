import { createRequire } from 'node:module'
import path from 'node:path'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import type { OAuthServer } from 'mcp-oauth-server'
import { CONNECTED_APPS, ConnectedApps, mountConsentRoutes } from './mcp-consent.routes'

const load = createRequire(__filename)
const libraryRoot = path.dirname(load.resolve('mcp-oauth-server'))
const { authorizationHandler } = load(path.join(libraryRoot, 'handlers/authorize.js')) as typeof import('mcp-oauth-server/dist/handlers/authorize.js')
const { tokenHandler } = load(path.join(libraryRoot, 'handlers/token.js')) as typeof import('mcp-oauth-server/dist/handlers/token.js')
const { clientRegistrationHandler } = load(path.join(libraryRoot, 'handlers/register.js')) as typeof import('mcp-oauth-server/dist/handlers/register.js')
const { revocationHandler } = load(path.join(libraryRoot, 'handlers/revoke.js')) as typeof import('mcp-oauth-server/dist/handlers/revoke.js')
const { authenticateHandler } = load(path.join(libraryRoot, 'handlers/authenticate.js')) as typeof import('mcp-oauth-server/dist/handlers/authenticate.js')

export const MCP_CIMD_FETCH = 'MCP_CIMD_FETCH'
export const MCP_CONSENT_USER = 'MCP_CONSENT_USER'
export const MCP_OAUTH_SERVER = 'MCP_OAUTH_SERVER'

const RATE_LIMIT_OFF = false as const

export type ConsentUser = (req: Request) => Promise<string> | string

export function mountMcpAuthorization(
  server: Express,
  oauth: OAuthServer,
  getUser: ConsentUser,
  apps: ConnectedApps = new ConnectedApps(),
): void {
  const options = { provider: oauth, rateLimit: RATE_LIMIT_OFF }
  server.use('/authorize', rewriteAuthorizeRedirect, authorizationHandler(options))
  server.use('/token', tokenHandler(options))
  server.use('/register', clientRegistrationHandler(options))
  server.use('/revoke', revocationHandler(options))
  server.use('/oauth/approve', rewriteAuthorizeRedirect, authenticateHandler({ ...options, getUser }))
  server.use('/oauth/consent', express.urlencoded({ extended: false }))
  mountConsentRoutes(server, oauth, getUser, apps)
}

function rewriteAuthorizeRedirect(req: Request, res: Response, next: NextFunction): void {
  const redirect = res.redirect.bind(res)
  res.redirect = ((status: number | string, url?: string) => {
    const code = typeof status === 'string' ? 302 : status
    const target = rewriteIss(typeof status === 'string' ? status : (url ?? ''))
    redirect(code, rewriteConsentHost(req, target))
  }) as typeof res.redirect
  next()
}

function rewriteConsentHost(req: Request, target: string): string {
  try {
    const url = new URL(target)
    if (url.pathname !== '/oauth/consent') return target
    const host = req.get('host')
    if (!host) return target
    url.protocol = req.protocol === 'https' ? 'https:' : 'http:'
    url.host = host
    return url.toString()
  } catch {
    return target
  }
}

function rewriteIss(target: string): string {
  try {
    const url = new URL(target)
    const iss = url.searchParams.get('iss')
    if (iss?.endsWith('/')) url.searchParams.set('iss', iss.slice(0, -1))
    return url.toString()
  } catch {
    return target
  }
}

export { CONNECTED_APPS, ConnectedApps }
