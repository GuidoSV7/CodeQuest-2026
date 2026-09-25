import type { AuthorizationCode, OAuthServerModel } from 'mcp-oauth-server'
import type { OAuthClientInformationFull } from 'mcp-oauth-server'

const issuedGrants = new WeakMap<OAuthServerModel, Map<string, string>>()

function grantKey(userId: string, clientId: string): string {
  return `${userId}\0${clientId}`
}

/** Remembers the library grant id written with each authorization code. */
export function captureIssuedGrants(model: OAuthServerModel): OAuthServerModel {
  const ledger = new Map<string, string>()
  const wrapped = new Proxy(model, {
    get(target, prop, receiver) {
      if (prop === 'saveAuthorizationCode') {
        return async (code: AuthorizationCode, client: OAuthClientInformationFull) => {
          await target.saveAuthorizationCode(code, client)
          if (code.grantId && code.userId) {
            ledger.set(grantKey(code.userId, code.clientId), code.grantId)
          }
        }
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value
    },
  })
  issuedGrants.set(wrapped, ledger)
  return wrapped
}

export function issuedGrantId(
  model: OAuthServerModel,
  userId: string,
  clientId: string,
): string | undefined {
  return issuedGrants.get(model)?.get(grantKey(userId, clientId))
}
