import type { DataSource } from 'typeorm'
import type {
  CourseProgressStatus,
  UserCourseProgressRecord,
  UserCourseProgressRepository,
} from '../ports/learning-path.ports'
import { UserCourseProgressOrmEntity } from './user-course-progress.orm-entity'

function toRecord(row: UserCourseProgressOrmEntity): UserCourseProgressRecord {
  return {
    userId: row.userId,
    courseId: row.courseId,
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    updatedAt: row.updatedAt,
  }
}

function applyTransition(
  row: UserCourseProgressOrmEntity,
  status: CourseProgressStatus,
  now: Date,
): void {
  if (status === 'not_started') {
    row.status = 'not_started'
    row.startedAt = null
    row.completedAt = null
    return
  }
  if (status === 'in_progress') {
    row.status = 'in_progress'
    row.startedAt = row.startedAt ?? now
    row.completedAt = null
    return
  }
  row.status = 'completed'
  row.startedAt = row.startedAt ?? now
  row.completedAt = now
}

export function createTypeormUserCourseProgressRepository(
  ds: DataSource,
): UserCourseProgressRepository {
  const repo = ds.getRepository(UserCourseProgressOrmEntity)

  return {
    async upsertStatus(userId, courseId, status) {
      const now = new Date()
      let row = await repo.findOne({ where: { userId, courseId } })
      if (!row) {
        row = repo.create({
          userId,
          courseId,
          status: 'not_started',
          startedAt: null,
          completedAt: null,
        })
      }
      applyTransition(row, status, now)
      const saved = await repo.save(row)
      return toRecord(saved)
    },

    async findByCourseIds(userId, courseIds) {
      const map = new Map<string, UserCourseProgressRecord>()
      if (courseIds.length === 0) return map
      const rows = await repo
        .createQueryBuilder('p')
        .where('p.user_id = :userId', { userId })
        .andWhere('p.course_id IN (:...courseIds)', { courseIds })
        .getMany()
      for (const row of rows) {
        map.set(row.courseId, toRecord(row))
      }
      return map
    },
  }
}
