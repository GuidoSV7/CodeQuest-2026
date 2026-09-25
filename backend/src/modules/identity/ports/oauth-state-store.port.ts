export type OAuthStatePayload = {
  returnTo: string
  createdAt: number
  mcpResumeId?: string
}

export type OAuthStateStore = {
  save(state: string, payload: OAuthStatePayload, ttlSeconds: number): Promise<void>
  /** One-shot: returns payload and deletes; null if missing or expired. */
  consume(state: string): Promise<OAuthStatePayload | null>
}

export const OAUTH_STATE_STORE = Symbol('OAUTH_STATE_STORE')
