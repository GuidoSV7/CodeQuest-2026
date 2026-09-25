export const MCP_TOKEN_VERIFIER = Symbol('MCP_TOKEN_VERIFIER')

export type VerifiedMcpToken = {
  userId: string
  scopes: string[]
  resource: string
  expiresAt: number
}

export type McpTokenVerifier = {
  verifyAccessToken(token: string): Promise<VerifiedMcpToken>
}

export const rejectAllMcpTokens: McpTokenVerifier = {
  async verifyAccessToken() {
    throw new Error('unknown_token')
  },
}
