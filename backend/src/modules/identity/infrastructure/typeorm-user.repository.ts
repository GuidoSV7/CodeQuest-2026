import type { DataSource } from 'typeorm'
import type {
  AuthAccountRecord,
  CreateDiscordUserInput,
  UpdateUserProfileInput,
  UserRecord,
  UserRepository,
} from '../ports/user-repository.port'
import { AuthAccountOrmEntity } from './auth-account.orm-entity'
import { UserOrmEntity } from './user.orm-entity'

function toUser(row: UserOrmEntity): UserRecord {
  return {
    id: row.id,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    email: row.email,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toAccount(row: AuthAccountOrmEntity): AuthAccountRecord {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    providerAccountId: row.providerAccountId,
    createdAt: row.createdAt,
  }
}

export function createTypeormUserRepository(ds: DataSource): UserRepository {
  const users = ds.getRepository(UserOrmEntity)
  const accounts = ds.getRepository(AuthAccountOrmEntity)

  return {
    async createWithDiscordAccount(input: CreateDiscordUserInput) {
      return ds.transaction(async (manager) => {
        const user = manager.create(UserOrmEntity, {
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          email: input.email,
        })
        const savedUser = await manager.save(user)
        const account = manager.create(AuthAccountOrmEntity, {
          userId: savedUser.id,
          provider: 'discord',
          providerAccountId: input.providerAccountId,
        })
        const savedAccount = await manager.save(account)
        return { user: toUser(savedUser), account: toAccount(savedAccount) }
      })
    },

    async findByProviderAccount(provider, providerAccountId) {
      const account = await accounts.findOne({
        where: { provider, providerAccountId },
      })
      if (!account) return null
      const user = await users.findOne({ where: { id: account.userId } })
      if (!user) return null
      return { user: toUser(user), account: toAccount(account) }
    },

    async findById(id) {
      const user = await users.findOne({ where: { id } })
      return user ? toUser(user) : null
    },

    async updateProfile(userId, input: UpdateUserProfileInput) {
      const user = await users.findOne({ where: { id: userId } })
      if (!user) throw new Error(`User not found: ${userId}`)
      user.displayName = input.displayName
      user.avatarUrl = input.avatarUrl
      if (input.email !== undefined && input.email !== null) {
        user.email = input.email
      }
      const saved = await users.save(user)
      return toUser(saved)
    },
  }
}
