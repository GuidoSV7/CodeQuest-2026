import { beforeEach, describe, expect, it } from 'vitest'
import { UnprocessableEntityException } from '@nestjs/common'
import { ProgressService } from './progress.service'
import { createInMemoryProgressRepo } from './test/in-memory-repos'
import type { UserCourseProgressRepository } from './ports/learning-path.ports'

const USER = '11111111-1111-4111-8111-111111111111'

describe('ProgressService', () => {
  let service: ProgressService
  let progress: UserCourseProgressRepository

  beforeEach(() => {
    progress = createInMemoryProgressRepo()
    service = new ProgressService(progress)
  })

  it('sets completed_at when status is completed', async () => {
    const dto = await service.upsert(USER, '3805831', 'completed')
    expect(dto.status).toBe('completed')
    expect(dto.completedAt).not.toBeNull()
    expect(dto.startedAt).not.toBeNull()
  })

  it('clears completed_at when moving back to in_progress', async () => {
    await service.upsert(USER, '3805831', 'completed')
    const dto = await service.upsert(USER, '3805831', 'in_progress')
    expect(dto.status).toBe('in_progress')
    expect(dto.completedAt).toBeNull()
    expect(dto.startedAt).not.toBeNull()
  })

  it('rejects non-numeric courseId with 422', async () => {
    await expect(
      service.upsert(USER, 'not-a-number', 'completed'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)
  })
})
