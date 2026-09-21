import type { DataSource } from 'typeorm'
import type {
  AddPathItemInput,
  LearningPathItemRecord,
  LearningPathItemRepository,
} from '../ports/learning-path.ports'
import { LearningPathItemOrmEntity } from './learning-path-item.orm-entity'
import { LearningPathOrmEntity } from './learning-path.orm-entity'

function toItem(row: LearningPathItemOrmEntity): LearningPathItemRecord {
  return {
    id: row.id,
    learningPathId: row.learningPathId,
    courseId: row.courseId,
    courseSlug: row.courseSlug,
    courseTitle: row.courseTitle,
    position: row.position,
    bucket: row.bucket,
    createdAt: row.createdAt,
  }
}

async function assertOwnedPath(
  ds: DataSource,
  pathId: string,
  userId: string,
): Promise<LearningPathOrmEntity> {
  const path = await ds.getRepository(LearningPathOrmEntity).findOne({
    where: { id: pathId, userId },
  })
  if (!path) throw new Error('Learning path not found')
  return path
}

async function recompactPositions(
  manager: DataSource['manager'],
  pathId: string,
): Promise<void> {
  const items = await manager.find(LearningPathItemOrmEntity, {
    where: { learningPathId: pathId },
    order: { position: 'ASC' },
  })
  // Two-phase update to avoid unique (path, position) collisions
  for (let i = 0; i < items.length; i++) {
    items[i]!.position = 1_000_000 + i
  }
  await manager.save(items)
  for (let i = 0; i < items.length; i++) {
    items[i]!.position = i
  }
  await manager.save(items)
}

export function createTypeormLearningPathItemRepository(
  ds: DataSource,
): LearningPathItemRepository {
  return {
    async add(pathId, userId, input: AddPathItemInput) {
      await assertOwnedPath(ds, pathId, userId)
      return ds.transaction(async (manager) => {
        const existing = await manager.find(LearningPathItemOrmEntity, {
          where: { learningPathId: pathId },
          order: { position: 'ASC' },
        })

        let insertAt = input.position
        if (insertAt === undefined || insertAt === null) {
          insertAt = existing.length
        }
        if (insertAt < 0 || insertAt > existing.length) {
          throw new Error('Invalid position')
        }

        for (const item of existing) {
          if (item.position >= insertAt) {
            item.position = 1_000_000 + item.position + 1
          }
        }
        await manager.save(existing)

        const created = manager.create(LearningPathItemOrmEntity, {
          learningPathId: pathId,
          courseId: input.courseId,
          courseSlug: input.courseSlug,
          courseTitle: input.courseTitle,
          position: insertAt,
          bucket: input.bucket,
        })
        const saved = await manager.save(created)
        await recompactPositions(manager, pathId)
        const refreshed = await manager.findOneByOrFail(LearningPathItemOrmEntity, {
          id: saved.id,
        })
        return toItem(refreshed)
      })
    },

    async remove(pathId, userId, itemId) {
      await assertOwnedPath(ds, pathId, userId)
      await ds.transaction(async (manager) => {
        const item = await manager.findOne(LearningPathItemOrmEntity, {
          where: { id: itemId, learningPathId: pathId },
        })
        if (!item) throw new Error('Learning path item not found')
        await manager.remove(item)
        await recompactPositions(manager, pathId)
      })
    },

    async reorder(pathId, userId, orderedItemIds) {
      await assertOwnedPath(ds, pathId, userId)
      await ds.transaction(async (manager) => {
        const existing = await manager.find(LearningPathItemOrmEntity, {
          where: { learningPathId: pathId },
        })
        if (existing.length !== orderedItemIds.length) {
          throw new Error('INVALID_ORDER')
        }
        const byId = new Map(existing.map((i) => [i.id, i]))
        for (const id of orderedItemIds) {
          if (!byId.has(id)) throw new Error('INVALID_ORDER')
        }

        for (let i = 0; i < orderedItemIds.length; i++) {
          const item = byId.get(orderedItemIds[i]!)!
          item.position = 1_000_000 + i
        }
        await manager.save([...byId.values()])

        for (let i = 0; i < orderedItemIds.length; i++) {
          const item = byId.get(orderedItemIds[i]!)!
          item.position = i
        }
        await manager.save([...byId.values()])
      })
    },
  }
}
