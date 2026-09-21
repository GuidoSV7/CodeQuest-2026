import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  startPgTestContext,
  truncateAll,
  type PgTestContext,
} from '../../../test-utils/pg-test-context'
import { createTypeormUserRepository } from '../../identity/infrastructure/typeorm-user.repository'
import { createTypeormLearningPathRepository } from '../infrastructure/typeorm-learning-path.repository'
import { createTypeormLearningPathItemRepository } from '../infrastructure/typeorm-learning-path-item.repository'
import { createTypeormUserCourseProgressRepository } from '../infrastructure/typeorm-user-course-progress.repository'

describe('LearningPath repositories (postgres)', () => {
  let ctx: PgTestContext
  let userIdA: string
  let userIdB: string

  beforeAll(async () => {
    ctx = await startPgTestContext()
    await ctx.dataSource.runMigrations()
  }, 120_000)

  afterAll(async () => {
    // Shared embedded PG — do not stop between suites.
  })

  beforeEach(async () => {
    await truncateAll(ctx.dataSource)
    const users = createTypeormUserRepository(ctx.dataSource)
    const a = await users.createWithDiscordAccount({
      displayName: 'User A',
      avatarUrl: null,
      email: null,
      providerAccountId: 'a-1',
    })
    const b = await users.createWithDiscordAccount({
      displayName: 'User B',
      avatarUrl: null,
      email: null,
      providerAccountId: 'b-1',
    })
    userIdA = a.user.id
    userIdB = b.user.id
  })

  it('creates a path with items and lists only the owning user paths', async () => {
    const paths = createTypeormLearningPathRepository(ctx.dataSource)
    await paths.create({
      userId: userIdA,
      title: 'A path',
      kind: 'custom',
      catalogVersion: 3,
      status: 'active',
      questionnaireResponseId: null,
      sourceCatalogPathId: null,
      items: [
        {
          courseId: '100',
          courseSlug: 'course-a',
          courseTitle: 'Course A',
          position: 0,
          bucket: null,
        },
        {
          courseId: '200',
          courseSlug: 'course-b',
          courseTitle: 'Course B',
          position: 1,
          bucket: 'required',
        },
      ],
    })
    await paths.create({
      userId: userIdB,
      title: 'B path',
      kind: 'custom',
      catalogVersion: 3,
      status: 'active',
      questionnaireResponseId: null,
      sourceCatalogPathId: null,
      items: [],
    })

    const listA = await paths.listByUser(userIdA, 'active')
    expect(listA).toHaveLength(1)
    expect(listA[0]!.title).toBe('A path')
    expect(listA[0]!.userId).toBe(userIdA)
  })

  it('gets a path with items ordered by position', async () => {
    const paths = createTypeormLearningPathRepository(ctx.dataSource)
    const created = await paths.create({
      userId: userIdA,
      title: 'Ordered',
      kind: 'custom',
      catalogVersion: 1,
      status: 'active',
      questionnaireResponseId: null,
      sourceCatalogPathId: null,
      items: [
        {
          courseId: '2',
          courseSlug: 'b',
          courseTitle: 'B',
          position: 1,
          bucket: null,
        },
        {
          courseId: '1',
          courseSlug: 'a',
          courseTitle: 'A',
          position: 0,
          bucket: null,
        },
      ],
    })

    const detail = await paths.findByIdForUser(created.id, userIdA)
    expect(detail).not.toBeNull()
    expect(detail!.items.map((i) => i.courseId)).toEqual(['1', '2'])
  })

  it('archives a path and hard-deletes cascading items', async () => {
    const paths = createTypeormLearningPathRepository(ctx.dataSource)
    const created = await paths.create({
      userId: userIdA,
      title: 'To archive',
      kind: 'custom',
      catalogVersion: 1,
      status: 'active',
      questionnaireResponseId: null,
      sourceCatalogPathId: null,
      items: [
        {
          courseId: '9',
          courseSlug: 'x',
          courseTitle: 'X',
          position: 0,
          bucket: null,
        },
      ],
    })

    await paths.archive(created.id, userIdA)
    const archived = await paths.findByIdForUser(created.id, userIdA)
    expect(archived!.status).toBe('archived')

    await paths.delete(created.id, userIdA)
    const gone = await paths.findByIdForUser(created.id, userIdA)
    expect(gone).toBeNull()

    const itemRows = await ctx.dataSource.query(
      `SELECT * FROM learning_path_items WHERE learning_path_id = $1`,
      [created.id],
    )
    expect(itemRows).toHaveLength(0)
  })

  it('rejects duplicate course_id within the same path', async () => {
    const paths = createTypeormLearningPathRepository(ctx.dataSource)
    const items = createTypeormLearningPathItemRepository(ctx.dataSource)
    const created = await paths.create({
      userId: userIdA,
      title: 'Dup',
      kind: 'custom',
      catalogVersion: 1,
      status: 'active',
      questionnaireResponseId: null,
      sourceCatalogPathId: null,
      items: [
        {
          courseId: '1',
          courseSlug: 'a',
          courseTitle: 'A',
          position: 0,
          bucket: null,
        },
      ],
    })

    await expect(
      items.add(created.id, userIdA, {
        courseId: '1',
        courseSlug: 'a',
        courseTitle: 'A',
        bucket: null,
      }),
    ).rejects.toThrow()
  })

  it('removes an item and recompacts positions; reorders', async () => {
    const paths = createTypeormLearningPathRepository(ctx.dataSource)
    const items = createTypeormLearningPathItemRepository(ctx.dataSource)
    const created = await paths.create({
      userId: userIdA,
      title: 'Reorder',
      kind: 'custom',
      catalogVersion: 1,
      status: 'active',
      questionnaireResponseId: null,
      sourceCatalogPathId: null,
      items: [
        {
          courseId: '1',
          courseSlug: 'a',
          courseTitle: 'A',
          position: 0,
          bucket: null,
        },
        {
          courseId: '2',
          courseSlug: 'b',
          courseTitle: 'B',
          position: 1,
          bucket: null,
        },
        {
          courseId: '3',
          courseSlug: 'c',
          courseTitle: 'C',
          position: 2,
          bucket: null,
        },
      ],
    })

    const mid = created.items.find((i) => i.courseId === '2')!
    await items.remove(created.id, userIdA, mid.id)

    let detail = await paths.findByIdForUser(created.id, userIdA)
    expect(detail!.items.map((i) => i.courseId)).toEqual(['1', '3'])
    expect(detail!.items.map((i) => i.position)).toEqual([0, 1])

    await items.reorder(
      created.id,
      userIdA,
      detail!.items.map((i) => i.id).reverse(),
    )
    detail = await paths.findByIdForUser(created.id, userIdA)
    expect(detail!.items.map((i) => i.courseId)).toEqual(['3', '1'])
    expect(detail!.items.map((i) => i.position)).toEqual([0, 1])
  })
})

describe('UserCourseProgressRepository (postgres)', () => {
  let ctx: PgTestContext
  let userId: string

  beforeAll(async () => {
    ctx = await startPgTestContext()
    await ctx.dataSource.runMigrations()
  }, 120_000)

  afterAll(async () => {
    // Shared embedded PG — do not stop between suites.
  })

  beforeEach(async () => {
    await truncateAll(ctx.dataSource)
    const users = createTypeormUserRepository(ctx.dataSource)
    const u = await users.createWithDiscordAccount({
      displayName: 'P',
      avatarUrl: null,
      email: null,
      providerAccountId: 'prog-1',
    })
    userId = u.user.id
  })

  it('upserts status and manages started_at / completed_at transitions', async () => {
    const progress = createTypeormUserCourseProgressRepository(ctx.dataSource)

    let row = await progress.upsertStatus(userId, '3805831', 'in_progress')
    expect(row.status).toBe('in_progress')
    expect(row.startedAt).not.toBeNull()
    expect(row.completedAt).toBeNull()

    row = await progress.upsertStatus(userId, '3805831', 'completed')
    expect(row.status).toBe('completed')
    expect(row.completedAt).not.toBeNull()
    expect(row.startedAt).not.toBeNull()

    row = await progress.upsertStatus(userId, '3805831', 'in_progress')
    expect(row.status).toBe('in_progress')
    expect(row.completedAt).toBeNull()

    row = await progress.upsertStatus(userId, '3805831', 'not_started')
    expect(row.status).toBe('not_started')
    expect(row.startedAt).toBeNull()
    expect(row.completedAt).toBeNull()
  })

  it('returns progress for a list of course ids for a user', async () => {
    const progress = createTypeormUserCourseProgressRepository(ctx.dataSource)
    await progress.upsertStatus(userId, '1', 'completed')
    await progress.upsertStatus(userId, '2', 'in_progress')

    const map = await progress.findByCourseIds(userId, ['1', '2', '3'])
    expect(map.get('1')?.status).toBe('completed')
    expect(map.get('2')?.status).toBe('in_progress')
    expect(map.has('3')).toBe(false)
  })
})
