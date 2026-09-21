import type { DataSource } from 'typeorm'
import type {
  CreateLearningPathInput,
  LearningPathItemRecord,
  LearningPathRecord,
  LearningPathRepository,
  LearningPathStatus,
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

function toPath(
  row: LearningPathOrmEntity,
  items: LearningPathItemOrmEntity[],
): LearningPathRecord {
  const ordered = [...items].sort((a, b) => a.position - b.position)
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    kind: row.kind,
    questionnaireResponseId: row.questionnaireResponseId,
    catalogVersion: row.catalogVersion,
    status: row.status,
    sourceCatalogPathId: row.sourceCatalogPathId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: ordered.map(toItem),
  }
}

export function createTypeormLearningPathRepository(
  ds: DataSource,
): LearningPathRepository {
  const paths = ds.getRepository(LearningPathOrmEntity)
  const items = ds.getRepository(LearningPathItemOrmEntity)

  async function loadForUser(
    pathId: string,
    userId: string,
  ): Promise<LearningPathRecord | null> {
    const path = await paths.findOne({ where: { id: pathId, userId } })
    if (!path) return null
    const pathItems = await items.find({
      where: { learningPathId: pathId },
      order: { position: 'ASC' },
    })
    return toPath(path, pathItems)
  }

  return {
    async create(input: CreateLearningPathInput) {
      return ds.transaction(async (manager) => {
        const path = manager.create(LearningPathOrmEntity, {
          userId: input.userId,
          title: input.title,
          kind: input.kind,
          catalogVersion: input.catalogVersion,
          status: input.status,
          questionnaireResponseId: input.questionnaireResponseId,
          sourceCatalogPathId: input.sourceCatalogPathId,
        })
        const saved = await manager.save(path)
        const itemEntities = input.items.map((i) =>
          manager.create(LearningPathItemOrmEntity, {
            learningPathId: saved.id,
            courseId: i.courseId,
            courseSlug: i.courseSlug,
            courseTitle: i.courseTitle,
            position: i.position,
            bucket: i.bucket,
          }),
        )
        const savedItems = itemEntities.length
          ? await manager.save(itemEntities)
          : []
        return toPath(saved, savedItems)
      })
    },

    async listByUser(userId, status: LearningPathStatus | 'all') {
      const where =
        status === 'all' ? { userId } : { userId, status }
      const rows = await paths.find({
        where,
        order: { createdAt: 'DESC' },
      })
      const result: LearningPathRecord[] = []
      for (const row of rows) {
        const pathItems = await items.find({
          where: { learningPathId: row.id },
          order: { position: 'ASC' },
        })
        result.push(toPath(row, pathItems))
      }
      return result
    },

    findByIdForUser: loadForUser,

    async setStatus(pathId, userId, status) {
      const path = await paths.findOne({ where: { id: pathId, userId } })
      if (!path) throw new Error('Learning path not found')
      path.status = status
      await paths.save(path)
      const detail = await loadForUser(pathId, userId)
      if (!detail) throw new Error('Learning path not found after status update')
      return detail
    },

    async archive(pathId, userId) {
      const path = await paths.findOne({ where: { id: pathId, userId } })
      if (!path) throw new Error('Learning path not found')
      path.status = 'archived'
      await paths.save(path)
      const detail = await loadForUser(pathId, userId)
      if (!detail) throw new Error('Learning path not found after archive')
      return detail
    },

    async delete(pathId, userId) {
      const path = await paths.findOne({ where: { id: pathId, userId } })
      if (!path) throw new Error('Learning path not found')
      await paths.remove(path)
    },

    async updateTitle(pathId, userId, title) {
      const path = await paths.findOne({ where: { id: pathId, userId } })
      if (!path) throw new Error('Learning path not found')
      path.title = title
      await paths.save(path)
      const detail = await loadForUser(pathId, userId)
      if (!detail) throw new Error('Learning path not found after update')
      return detail
    },
  }
}
