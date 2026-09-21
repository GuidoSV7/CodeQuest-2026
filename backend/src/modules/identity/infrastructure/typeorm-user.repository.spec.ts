import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  startPgTestContext,
  truncateAll,
  type PgTestContext,
} from '../../../test-utils/pg-test-context'
import { createTypeormUserRepository } from './typeorm-user.repository'

describe('UserRepository (postgres)', () => {
  let ctx: PgTestContext

  beforeAll(async () => {
    ctx = await startPgTestContext()
    await ctx.dataSource.runMigrations()
  }, 120_000)

  afterAll(async () => {
    // Shared embedded PG lives for the whole vitest process (fileParallelism: false).
  })

  beforeEach(async () => {
    await truncateAll(ctx.dataSource)
  })

  it('creates a user with a Discord auth account', async () => {
    const repo = createTypeormUserRepository(ctx.dataSource)
    const result = await repo.createWithDiscordAccount({
      displayName: 'Guido',
      avatarUrl: 'https://cdn.discordapp.com/avatars/1/a.png',
      email: 'guido@example.com',
      providerAccountId: '123456789012345678',
    })

    expect(result.user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    expect(result.user.displayName).toBe('Guido')
    expect(result.user.avatarUrl).toContain('cdn.discordapp.com')
    expect(result.user.email).toBe('guido@example.com')
    expect(result.account.provider).toBe('discord')
    expect(result.account.providerAccountId).toBe('123456789012345678')
    expect(result.account.userId).toBe(result.user.id)
  })

  it('finds user by (provider, provider_account_id)', async () => {
    const repo = createTypeormUserRepository(ctx.dataSource)
    const created = await repo.createWithDiscordAccount({
      displayName: 'Ada',
      avatarUrl: null,
      email: null,
      providerAccountId: '999',
    })

    const found = await repo.findByProviderAccount('discord', '999')
    expect(found).not.toBeNull()
    expect(found!.user.id).toBe(created.user.id)
    expect(found!.account.providerAccountId).toBe('999')
  })

  it('updates display_name/avatar/email on subsequent login profile update', async () => {
    const repo = createTypeormUserRepository(ctx.dataSource)
    const created = await repo.createWithDiscordAccount({
      displayName: 'Old',
      avatarUrl: null,
      email: null,
      providerAccountId: '42',
    })

    const updated = await repo.updateProfile(created.user.id, {
      displayName: 'New Name',
      avatarUrl: 'https://cdn.example/a.png',
      email: 'new@example.com',
    })

    expect(updated.displayName).toBe('New Name')
    expect(updated.avatarUrl).toBe('https://cdn.example/a.png')
    expect(updated.email).toBe('new@example.com')
  })

  it('rejects duplicate (provider, provider_account_id)', async () => {
    const repo = createTypeormUserRepository(ctx.dataSource)
    await repo.createWithDiscordAccount({
      displayName: 'A',
      avatarUrl: null,
      email: null,
      providerAccountId: 'dup-1',
    })

    await expect(
      repo.createWithDiscordAccount({
        displayName: 'B',
        avatarUrl: null,
        email: null,
        providerAccountId: 'dup-1',
      }),
    ).rejects.toThrow()
  })

  it('cascade-deletes auth_accounts when user is deleted', async () => {
    const repo = createTypeormUserRepository(ctx.dataSource)
    const created = await repo.createWithDiscordAccount({
      displayName: 'X',
      avatarUrl: null,
      email: null,
      providerAccountId: 'del-me',
    })

    await ctx.dataSource.query(`DELETE FROM users WHERE id = $1`, [
      created.user.id,
    ])

    const rows = await ctx.dataSource.query(
      `SELECT * FROM auth_accounts WHERE provider_account_id = $1`,
      ['del-me'],
    )
    expect(rows).toHaveLength(0)
  })
})
