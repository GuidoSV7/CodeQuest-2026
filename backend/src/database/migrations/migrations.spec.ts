import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  startPgTestContext,
  type PgTestContext,
} from '../../test-utils/pg-test-context'

describe('migrations (postgres empty DB)', () => {
  let ctx: PgTestContext

  beforeAll(async () => {
    ctx = await startPgTestContext()
  }, 120_000)

  afterAll(async () => {
    // Shared embedded PG — do not stop between suites.
  })

  it('applies migrations on empty database and creates expected tables', async () => {
    const executed = await ctx.dataSource.runMigrations()
    expect(executed.length).toBeGreaterThanOrEqual(1)

    const tables = await ctx.dataSource.query<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    )
    const names = tables.map((t) => t.tablename)
    expect(names).toEqual(
      expect.arrayContaining([
        'users',
        'auth_accounts',
        'questionnaire_responses',
        'learning_paths',
        'learning_path_items',
        'user_course_progress',
        'migrations',
      ]),
    )

    const uniques = await ctx.dataSource.query<{ conname: string }[]>(
      `SELECT conname FROM pg_constraint WHERE conname IN (
        'auth_accounts_provider_account_uidx',
        'learning_path_items_path_course_uidx',
        'learning_path_items_path_position_uidx'
      )`,
    )
    expect(uniques.map((u) => u.conname).sort()).toEqual([
      'auth_accounts_provider_account_uidx',
      'learning_path_items_path_course_uidx',
      'learning_path_items_path_position_uidx',
    ])
  })

  it('reverts the last migration (down) when supported', async () => {
    // Ensure up
    if ((await ctx.dataSource.showMigrations()) === false) {
      // already applied from previous test in same DS — ok
    } else {
      await ctx.dataSource.runMigrations()
    }

    await ctx.dataSource.undoLastMigration()

    const tables = await ctx.dataSource.query<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users'`,
    )
    expect(tables).toHaveLength(0)

    // Re-apply for other suites sharing process if any
    await ctx.dataSource.runMigrations()
  })
})
