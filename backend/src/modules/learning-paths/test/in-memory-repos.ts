import { randomUUID } from 'node:crypto'
import type {
  AddPathItemInput,
  CreateLearningPathInput,
  LearningPathItemRecord,
  LearningPathItemRepository,
  LearningPathRecord,
  LearningPathRepository,
  LearningPathStatus,
  UserCourseProgressRecord,
  UserCourseProgressRepository,
} from '../ports/learning-path.ports'

/** Mutable in-memory store shared by path + item fakes in unit tests. */
export type PathStore = Map<string, LearningPathRecord>

export function createInMemoryPathRepo(
  store: PathStore = new Map(),
): LearningPathRepository {
  return {
    async create(input: CreateLearningPathInput) {
      const id = randomUUID()
      const now = new Date()
      const record: LearningPathRecord = {
        id,
        userId: input.userId,
        title: input.title,
        kind: input.kind,
        questionnaireResponseId: input.questionnaireResponseId,
        catalogVersion: input.catalogVersion,
        status: input.status,
        sourceCatalogPathId: input.sourceCatalogPathId,
        createdAt: now,
        updatedAt: now,
        items: input.items.map((i) => ({
          id: randomUUID(),
          learningPathId: id,
          courseId: i.courseId,
          courseSlug: i.courseSlug,
          courseTitle: i.courseTitle,
          position: i.position,
          bucket: i.bucket,
          createdAt: now,
        })),
      }
      store.set(id, record)
      return clone(record)
    },
    async listByUser(userId, status: LearningPathStatus | 'all') {
      return [...store.values()]
        .filter((p) => p.userId === userId)
        .filter((p) => (status === 'all' ? true : p.status === status))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(clone)
    },
    async findByIdForUser(pathId, userId) {
      const p = store.get(pathId)
      if (!p || p.userId !== userId) return null
      return clone(p)
    },
    async archive(pathId, userId) {
      const p = store.get(pathId)
      if (!p || p.userId !== userId) throw new Error('Learning path not found')
      p.status = 'archived'
      p.updatedAt = new Date()
      return clone(p)
    },
    async setStatus(pathId, userId, status) {
      const p = store.get(pathId)
      if (!p || p.userId !== userId) throw new Error('Learning path not found')
      p.status = status
      p.updatedAt = new Date()
      return clone(p)
    },
    async delete(pathId, userId) {
      const p = store.get(pathId)
      if (!p || p.userId !== userId) throw new Error('Learning path not found')
      store.delete(pathId)
    },
    async updateTitle(pathId, userId, title) {
      const p = store.get(pathId)
      if (!p || p.userId !== userId) throw new Error('Learning path not found')
      p.title = title
      p.updatedAt = new Date()
      return clone(p)
    },
  }
}

export function createInMemoryItemRepo(
  store: PathStore,
): LearningPathItemRepository {
  function owned(pathId: string, userId: string): LearningPathRecord {
    const p = store.get(pathId)
    if (!p || p.userId !== userId) throw new Error('Learning path not found')
    return p
  }

  function recompact(path: LearningPathRecord): void {
    path.items
      .sort((a, b) => a.position - b.position)
      .forEach((item, idx) => {
        item.position = idx
      })
    path.updatedAt = new Date()
  }

  return {
    async add(pathId, userId, input: AddPathItemInput) {
      const path = owned(pathId, userId)
      if (path.items.some((i) => i.courseId === input.courseId)) {
        throw new Error('COURSE_ALREADY_IN_PATH')
      }
      const insertAt = input.position ?? path.items.length
      for (const item of path.items) {
        if (item.position >= insertAt) item.position += 1
      }
      const created: LearningPathItemRecord = {
        id: randomUUID(),
        learningPathId: pathId,
        courseId: input.courseId,
        courseSlug: input.courseSlug,
        courseTitle: input.courseTitle,
        position: insertAt,
        bucket: input.bucket,
        createdAt: new Date(),
      }
      path.items.push(created)
      recompact(path)
      return clone(path.items.find((i) => i.id === created.id)!)
    },
    async remove(pathId, userId, itemId) {
      const path = owned(pathId, userId)
      const before = path.items.length
      path.items = path.items.filter((i) => i.id !== itemId)
      if (path.items.length === before) {
        throw new Error('Learning path item not found')
      }
      recompact(path)
    },
    async reorder(pathId, userId, orderedItemIds) {
      const path = owned(pathId, userId)
      if (path.items.length !== orderedItemIds.length) {
        throw new Error('INVALID_ORDER')
      }
      const byId = new Map(path.items.map((i) => [i.id, i]))
      for (const id of orderedItemIds) {
        if (!byId.has(id)) throw new Error('INVALID_ORDER')
      }
      path.items = orderedItemIds.map((id, position) => ({
        ...byId.get(id)!,
        position,
      }))
      path.updatedAt = new Date()
    },
  }
}

export function createInMemoryProgressRepo(): UserCourseProgressRepository {
  const store = new Map<string, UserCourseProgressRecord>()
  const key = (userId: string, courseId: string) => `${userId}:${courseId}`

  return {
    async upsertStatus(userId, courseId, status) {
      const now = new Date()
      const k = key(userId, courseId)
      let row = store.get(k)
      if (!row) {
        row = {
          userId,
          courseId,
          status: 'not_started',
          startedAt: null,
          completedAt: null,
          updatedAt: now,
        }
      }
      if (status === 'not_started') {
        row = {
          ...row,
          status,
          startedAt: null,
          completedAt: null,
          updatedAt: now,
        }
      } else if (status === 'in_progress') {
        row = {
          ...row,
          status,
          startedAt: row.startedAt ?? now,
          completedAt: null,
          updatedAt: now,
        }
      } else {
        row = {
          ...row,
          status,
          startedAt: row.startedAt ?? now,
          completedAt: now,
          updatedAt: now,
        }
      }
      store.set(k, row)
      return structuredClone(row)
    },
    async findByCourseIds(userId, courseIds) {
      const map = new Map<string, UserCourseProgressRecord>()
      for (const courseId of courseIds) {
        const row = store.get(key(userId, courseId))
        if (row) map.set(courseId, structuredClone(row))
      }
      return map
    },
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}
