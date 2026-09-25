export const MCP_ISSUER_URL =
  'https://codequest-backend-zhydji-2dfcea-31-97-78-167.sslip.io'

export const MCP_RESOURCE_URL = `${MCP_ISSUER_URL}/mcp/user`

export const MCP_RESOURCE_METADATA_URL = `${MCP_ISSUER_URL}/.well-known/oauth-protected-resource/mcp/user`

export const MCP_SCOPES = [
  'profile:read',
  'paths:read',
  'paths:write',
  'progress:read',
  'progress:write',
] as const

export const MCP_TOOL_SCOPES: Record<string, readonly string[]> = {
  get_my_profile: ['profile:read'],
  list_my_paths: ['paths:read'],
  get_my_path: ['paths:read', 'progress:read'],
  save_learning_path: ['paths:write'],
  update_course_progress: ['progress:write'],
}

export function protectedResourceMetadata() {
  return {
    resource: MCP_RESOURCE_URL,
    authorization_servers: [MCP_ISSUER_URL],
    scopes_supported: [...MCP_SCOPES],
    bearer_methods_supported: ['header'],
    resource_name: 'CodeQuest',
  }
}

export function authorizationServerMetadata() {
  return {
    issuer: MCP_ISSUER_URL,
    authorization_endpoint: `${MCP_ISSUER_URL}/authorize`,
    token_endpoint: `${MCP_ISSUER_URL}/token`,
    registration_endpoint: `${MCP_ISSUER_URL}/register`,
    revocation_endpoint: `${MCP_ISSUER_URL}/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    revocation_endpoint_auth_methods_supported: ['none'],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
    scopes_supported: [...MCP_SCOPES],
  }
}

export function unauthenticatedChallenge(): string {
  return `Bearer resource_metadata="${MCP_RESOURCE_METADATA_URL}", scope="${MCP_SCOPES.join(' ')}"`
}

export function insufficientScopeChallenge(missing: string[]): string {
  return `Bearer error="insufficient_scope", scope="${missing.join(' ')}", resource_metadata="${MCP_RESOURCE_METADATA_URL}"`
}
