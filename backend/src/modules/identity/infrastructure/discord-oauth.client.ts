export type DiscordHttpFetcher = (
  url: string | URL,
  init?: {
    method?: string
    headers?: Record<string, string>
    body?: string
  },
) => Promise<{
  status: number
  json: () => Promise<unknown>
}>

export type DiscordOAuthClientOptions = {
  clientId: string
  clientSecret: string
  redirectUri: string
  fetcher: DiscordHttpFetcher
}

export type DiscordUserProfile = {
  id: string
  displayName: string
  email: string | null
  avatarUrl: string | null
}

export type DiscordOAuthClient = {
  exchangeCodeAndFetchUser(code: string): Promise<DiscordUserProfile>
  buildAuthorizeUrl(state: string): string
}

const TOKEN_URL = 'https://discord.com/api/v10/oauth2/token'
const ME_URL = 'https://discord.com/api/v10/users/@me'
const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize'

type TokenResponse = {
  access_token?: string
  token_type?: string
}

type DiscordMeResponse = {
  id?: string
  username?: string
  global_name?: string | null
  avatar?: string | null
  email?: string | null
}

function buildAvatarUrl(userId: string, avatar: string | null | undefined): string {
  if (avatar) {
    const extension = avatar.startsWith('a_') ? 'gif' : 'png'
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${extension}`
  }
  const index = Number((BigInt(userId) >> 22n) % 6n)
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`
}

function resolveDisplayName(
  globalName: string | null | undefined,
  username: string | undefined,
): string {
  const trimmed = globalName?.trim()
  if (trimmed) return trimmed
  return username?.trim() || 'Discord User'
}

export function createDiscordOAuthClient(
  options: DiscordOAuthClientOptions,
): DiscordOAuthClient {
  const { clientId, clientSecret, redirectUri, fetcher } = options

  return {
    buildAuthorizeUrl(state: string): string {
      const url = new URL(AUTHORIZE_URL)
      url.searchParams.set('client_id', clientId)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('scope', 'identify email')
      url.searchParams.set('state', state)
      return url.toString()
    },

    async exchangeCodeAndFetchUser(code: string): Promise<DiscordUserProfile> {
      let accessToken: string | undefined
      let refreshToken: string | undefined

      try {
        const body = new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        })

        const tokenRes = await fetcher(TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        })

        if (tokenRes.status < 200 || tokenRes.status >= 300) {
          throw new Error('token_exchange_failed')
        }

        const tokenJson = (await tokenRes.json()) as TokenResponse & {
          refresh_token?: string
        }
        accessToken = tokenJson.access_token
        refreshToken = tokenJson.refresh_token

        if (!accessToken) {
          throw new Error('token_exchange_failed')
        }

        const meRes = await fetcher(ME_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (meRes.status < 200 || meRes.status >= 300) {
          throw new Error('profile_failed')
        }

        const me = (await meRes.json()) as DiscordMeResponse
        if (!me.id) {
          throw new Error('profile_failed')
        }

        return {
          id: me.id,
          displayName: resolveDisplayName(me.global_name, me.username),
          email: me.email ?? null,
          avatarUrl: buildAvatarUrl(me.id, me.avatar),
        }
      } finally {
        // Ensure Discord tokens never leave this function scope.
        accessToken = undefined
        refreshToken = undefined
      }
    },
  }
}
