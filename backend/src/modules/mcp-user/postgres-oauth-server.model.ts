import { createHash } from 'node:crypto'
import type { DataSource } from 'typeorm'
import type {
  AccessToken,
  AuthorizationCode,
  ClientIdMetadataDocument,
  RefreshToken,
} from 'mcp-oauth-server'
import type { OAuthClientInformationFull, OAuthClientMetadata } from 'mcp-oauth-server'
import type { OAuthServerModel } from 'mcp-oauth-server'

function tokenHash(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

type ClientRow = { client_json: OAuthClientInformationFull }

export function createPostgresOAuthServerModel(dataSource: DataSource): OAuthServerModel {
  return {
    async getClient(clientId) {
      const rows = (await dataSource.query(
        `SELECT client_json FROM oauth_clients WHERE client_id = $1`,
        [clientId],
      )) as ClientRow[]
      const client = rows[0]?.client_json
      if (!client) return undefined
      const { client_secret: _secret, ...rest } = client
      return rest
    },

    async registerClient(client: OAuthClientMetadata & Partial<OAuthClientInformationFull>) {
      const stored: OAuthClientInformationFull = { ...client } as OAuthClientInformationFull
      const secret = stored.client_secret
      if (secret) delete stored.client_secret
      await dataSource.query(
        `INSERT INTO oauth_clients (
           client_id, client_name, redirect_uris, token_endpoint_auth_method,
           client_secret_hash, grant_types, scope, client_json
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          stored.client_id,
          stored.client_name ?? null,
          stored.redirect_uris,
          stored.token_endpoint_auth_method ?? null,
          secret ? tokenHash(secret) : null,
          stored.grant_types ?? null,
          stored.scope ?? null,
          JSON.stringify(stored),
        ],
      )
      return secret ? { ...stored, client_secret: secret } : stored
    },

    async saveAuthorizationCode(code: AuthorizationCode) {
      await dataSource.query(
        `INSERT INTO oauth_authorization_codes (
           code_hash, client_id, user_id, redirect_uri, code_challenge, scopes, resource, grant_id, expires_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          tokenHash(code.authorizationCode),
          code.clientId,
          code.userId ?? null,
          code.redirectUri,
          code.codeChallenge,
          code.scopes ?? [],
          code.resource ?? null,
          code.grantId ?? null,
          code.expiresAt,
        ],
      )
    },

    async consumeAuthorizationCode(authorizationCode, clientId) {
      const row = firstReturnedRow(
        await dataSource.query(
          `DELETE FROM oauth_authorization_codes
           WHERE code_hash = $1 AND client_id = $2
           RETURNING client_id, user_id, redirect_uri, code_challenge, scopes, resource, grant_id, expires_at`,
          [tokenHash(authorizationCode), clientId],
        ),
      )
      if (!row) return undefined
      return codeFromRow(authorizationCode, row)
    },

    async saveAccessToken(token: AccessToken) {
      await dataSource.query(
        `INSERT INTO oauth_access_tokens (
           token_hash, user_id, client_id, scopes, resource, grant_id, expires_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          tokenHash(token.token),
          token.userId ?? null,
          token.clientId,
          token.scopes,
          token.resource ?? null,
          token.grantId ?? null,
          token.expiresAt,
        ],
      )
    },

    async getAccessToken(accessToken) {
      const rows = (await dataSource.query(
        `SELECT user_id, client_id, scopes, resource, grant_id, expires_at, revoked_at
         FROM oauth_access_tokens WHERE token_hash = $1`,
        [tokenHash(accessToken)],
      )) as Array<Record<string, unknown>>
      const row = rows[0]
      if (!row || row.revoked_at) return undefined
      return {
        token: accessToken,
        clientId: String(row.client_id),
        userId: row.user_id ? String(row.user_id) : undefined,
        scopes: asStringArray(row.scopes),
        resource: row.resource ? String(row.resource) : undefined,
        grantId: row.grant_id ? String(row.grant_id) : undefined,
        expiresAt: new Date(String(row.expires_at)),
      }
    },

    async revokeAccessToken(accessToken, clientId) {
      const row = firstReturnedRow(
        await dataSource.query(
          `DELETE FROM oauth_access_tokens
           WHERE token_hash = $1 AND client_id = $2
           RETURNING user_id, client_id, scopes, resource, grant_id, expires_at`,
          [tokenHash(accessToken), clientId],
        ),
      )
      if (!row) return undefined
      return {
        token: accessToken,
        clientId: String(row.client_id),
        userId: row.user_id ? String(row.user_id) : undefined,
        scopes: asStringArray(row.scopes),
        resource: row.resource ? String(row.resource) : undefined,
        grantId: row.grant_id ? String(row.grant_id) : undefined,
        expiresAt: new Date(String(row.expires_at)),
      }
    },

    async saveRefreshToken(token: RefreshToken) {
      await dataSource.query(
        `INSERT INTO oauth_refresh_tokens (
           token_hash, client_id, user_id, grant_id, scopes, resource, expires_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          tokenHash(token.token),
          token.clientId,
          token.userId ?? null,
          token.grantId ?? null,
          token.scopes,
          token.resource ?? null,
          token.expiresAt,
        ],
      )
    },

    async consumeRefreshToken(refreshToken, clientId) {
      const row = firstReturnedRow(
        await dataSource.query(
          `DELETE FROM oauth_refresh_tokens
           WHERE token_hash = $1 AND client_id = $2 AND consumed_at IS NULL
           RETURNING client_id, user_id, grant_id, scopes, resource, expires_at`,
          [tokenHash(refreshToken), clientId],
        ),
      )
      if (!row) return undefined
      return {
        token: refreshToken,
        clientId: String(row.client_id),
        userId: row.user_id ? String(row.user_id) : undefined,
        scopes: asStringArray(row.scopes),
        resource: row.resource ? String(row.resource) : undefined,
        grantId: row.grant_id ? String(row.grant_id) : undefined,
        expiresAt: new Date(String(row.expires_at)),
      }
    },

    async revokeRefreshToken(refreshToken, clientId) {
      return this.consumeRefreshToken!(refreshToken, clientId)
    },

    async revokeGrant(grantId) {
      await dataSource.query(`DELETE FROM oauth_access_tokens WHERE grant_id = $1`, [grantId])
      await dataSource.query(`DELETE FROM oauth_refresh_tokens WHERE grant_id = $1`, [grantId])
    },

    async saveClientIdMetadataDocument(document: ClientIdMetadataDocument) {
      await dataSource.query(
        `INSERT INTO oauth_cimd_documents (client_id, document, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (client_id) DO UPDATE SET document = EXCLUDED.document, expires_at = EXCLUDED.expires_at, fetched_at = now()`,
        [document.client.client_id, JSON.stringify(document), document.expiresAt],
      )
    },

    async getClientIdMetadataDocument(clientId) {
      const rows = (await dataSource.query(
        `SELECT document FROM oauth_cimd_documents WHERE client_id = $1 AND expires_at > now()`,
        [clientId],
      )) as Array<{ document: ClientIdMetadataDocument }>
      return rows[0]?.document
    },
  }
}

function codeFromRow(rawCode: string, row: Record<string, unknown>): AuthorizationCode {
  return {
    authorizationCode: rawCode,
    clientId: String(row.client_id),
    userId: String(row.user_id),
    redirectUri: String(row.redirect_uri),
    codeChallenge: String(row.code_challenge),
    scopes: asStringArray(row.scopes),
    resource: row.resource ? String(row.resource) : undefined,
    grantId: row.grant_id ? String(row.grant_id) : undefined,
    expiresAt: new Date(String(row.expires_at)),
  }
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  return []
}

/** TypeORM returns DELETE/UPDATE as `[rows, rowCount]` and SELECT as `rows`. */
function firstReturnedRow(result: unknown): Record<string, unknown> | undefined {
  if (!Array.isArray(result)) return undefined
  const head = result[0]
  if (Array.isArray(head)) {
    const row = head[0]
    return row && typeof row === 'object' ? (row as Record<string, unknown>) : undefined
  }
  if (head && typeof head === 'object') return head as Record<string, unknown>
  return undefined
}
