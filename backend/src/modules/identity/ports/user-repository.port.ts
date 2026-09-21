export type AuthProvider = 'discord'

export type UserRecord = {
  id: string
  displayName: string
  avatarUrl: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
}

export type AuthAccountRecord = {
  id: string
  userId: string
  provider: AuthProvider
  providerAccountId: string
  createdAt: Date
}

export type CreateDiscordUserInput = {
  displayName: string
  avatarUrl: string | null
  email: string | null
  providerAccountId: string
}

export type UpdateUserProfileInput = {
  displayName: string
  avatarUrl: string | null
  email?: string | null
}

export type UserRepository = {
  createWithDiscordAccount(
    input: CreateDiscordUserInput,
  ): Promise<{ user: UserRecord; account: AuthAccountRecord }>
  findByProviderAccount(
    provider: AuthProvider,
    providerAccountId: string,
  ): Promise<{ user: UserRecord; account: AuthAccountRecord } | null>
  findById(id: string): Promise<UserRecord | null>
  updateProfile(userId: string, input: UpdateUserProfileInput): Promise<UserRecord>
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY')
