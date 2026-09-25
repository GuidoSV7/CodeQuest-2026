import { randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'
import type { OAuthServer } from 'mcp-oauth-server'
import { MCP_ISSUER_URL } from './mcp-oauth.metadata'
import { issuedGrantId } from './oauth-grant-ledger'
import type { ConsentUser } from './mount-mcp-authorization'

export type ConnectedApp = {
  grant_id: string
  client_name: string
  hostname: string
  scopes: string[]
}

export class ConnectedApps {
  private readonly rows = new Map<string, ConnectedApp & { userId: string }>()

  add(userId: string, app: ConnectedApp): void {
    this.rows.set(app.grant_id, { ...app, userId })
  }

  owns(userId: string, grantId: string): boolean {
    const row = this.rows.get(grantId)
    return Boolean(row && row.userId === userId)
  }

  list(userId: string): ConnectedApp[] {
    return [...this.rows.values()]
      .filter((row) => row.userId === userId)
      .map(({ grant_id, client_name, hostname, scopes }) => ({
        grant_id,
        client_name,
        hostname,
        scopes,
      }))
  }

  revoke(userId: string, grantId: string): boolean {
    const row = this.rows.get(grantId)
    if (!row || row.userId !== userId) return false
    this.rows.delete(grantId)
    return true
  }
}

type StoredConsent = {
  userId: string
  fields: Record<string, string>
}

const consents = new Map<string, StoredConsent>()

const resumes = new Map<string, Record<string, string>>()

export function mountConsentRoutes(
  server: { use: (path: string, handler: (req: Request, res: Response) => Promise<void> | void) => void },
  oauth: OAuthServer,
  getUser: ConsentUser,
  apps: ConnectedApps,
): void {
  server.use('/oauth/consent', async (req, res) => {
    const userId = await readUser(getUser, req)
    const fields = req.method === 'GET' ? queryFields(req) : bodyFields(req)
    if (!userId) {
      const resumeId = randomBytes(16).toString('base64url')
      resumes.set(resumeId, fields)
      res.redirect(302, `/api/auth/discord/start?mcp_resume=${resumeId}`)
      return
    }
    if (req.method === 'GET') {
      const csrf = randomBytes(16).toString('base64url')
      consents.set(csrf, { userId, fields })
      res.type('html').send(renderConsent(fields, csrf))
      return
    }
    const stored = consents.get(fields.csrf ?? '')
    if (!stored || stored.userId !== userId) {
      res.status(403).type('text').send('csrf')
      return
    }
    consents.delete(fields.csrf ?? '')
    const redirectUri = stored.fields.redirect_uri ?? ''
    if (fields.decision === 'deny') {
      const back = new URL(redirectUri)
      back.searchParams.set('error', 'access_denied')
      back.searchParams.set('iss', MCP_ISSUER_URL)
      if (stored.fields.state) back.searchParams.set('state', stored.fields.state)
      res.redirect(302, back.toString())
      return
    }
    const client = await oauth.getClient(stored.fields.client_id ?? '')
    if (!client) {
      res.status(400).json({ error: 'invalid_client' })
      return
    }
    const scopes = (stored.fields.scope ?? '').split(' ').filter(Boolean)
    await oauth.authenticate(
      client,
      {
        state: stored.fields.state,
        scopes,
        redirectUri,
        codeChallenge: stored.fields.code_challenge ?? '',
        resource: stored.fields.resource ? new URL(stored.fields.resource) : undefined,
      },
      userId,
      res,
    )
    const hostname = safeHostname(redirectUri)
    const grantId = issuedGrantId(oauth.model, userId, client.client_id)
    if (!grantId) return
    apps.add(userId, {
      grant_id: grantId,
      client_name: client.client_name ?? client.client_id,
      hostname,
      scopes,
    })
  })

  server.use('/oauth/resume', async (req, res) => {
    const rid = typeof req.query.rid === 'string' ? req.query.rid : ''
    const fields = resumes.get(rid)
    if (!fields) {
      res.redirect(302, '/auth/error')
      return
    }
    const userId = await readUser(getUser, req)
    if (!userId) {
      res.redirect(302, '/auth/error')
      return
    }
    resumes.delete(rid)
    const next = new URL('/oauth/consent', 'http://localhost')
    for (const [key, value] of Object.entries(fields)) next.searchParams.set(key, value)
    res.redirect(302, `${next.pathname}${next.search}`)
  })
}

function renderConsent(fields: Record<string, string>, csrf: string): string {
  const hostname = safeHostname(fields.redirect_uri ?? '')
  const hidden = Object.entries(fields)
    .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}"/>`)
    .join('')
  const loopback = hostname === '127.0.0.1' || hostname === 'localhost'
  return `<form method="post">
    <p>${escapeHtml(hostname)}</p>
    ${loopback ? '<p>El código puede volver a un programa en esta máquina.</p>' : ''}
    ${hidden}
    <input type="hidden" name="csrf" value="${escapeHtml(csrf)}"/>
    <button name="decision" value="allow">Permitir</button>
    <button name="decision" value="deny">Rechazar</button>
  </form>`
}

async function readUser(getUser: ConsentUser, req: Request): Promise<string> {
  try {
    return (await getUser(req)) || ''
  } catch {
    return ''
  }
}

function queryFields(req: Request): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') fields[key] = value
  }
  return fields
}

function bodyFields(req: Request): Record<string, string> {
  const fields: Record<string, string> = {}
  const body = req.body as Record<string, unknown> | undefined
  if (!body || typeof body !== 'object') return fields
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') fields[key] = value
  }
  return fields
}

function safeHostname(value: string): string {
  try {
    return new URL(value).hostname
  } catch {
    return ''
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

export const CONNECTED_APPS = 'CONNECTED_APPS'
