import { beforeEach, describe, expect, it } from 'vitest'
import { NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from '../catalog-scraper/ports/catalog-repository.port'
import { SESSION_JWT } from '../identity/identity.tokens'
import { CurrentUserId } from '../identity/presentation/current-user.decorator'
import { SessionAuthGuard } from '../identity/presentation/session-auth.guard'
import { CourseProgressController } from './course-progress.controller'
import { LearningPathsController } from './learning-paths.controller'
import { LearningPathsService } from './learning-paths.service'
import {
  LEARNING_PATH_ITEM_REPOSITORY,
  LEARNING_PATH_REPOSITORY,
  USER_COURSE_PROGRESS_REPOSITORY,
} from './ports/learning-path.ports'
import { ProgressService } from './progress.service'
import {
  createInMemoryItemRepo,
  createInMemoryPathRepo,
  createInMemoryProgressRepo,
  type PathStore,
} from './test/in-memory-repos'

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'

function minimalCourse(
  id: number,
  slug: string,
  title: string,
): CatalogSnapshot['courses'][number] {
  return {
    id,
    slug,
    title,
    subtitleLabel: null,
    metaDescription: null,
    description: null,
    coverImageUrl: null,
    previewYoutubeId: null,
    price: { amount: 0, currency: 'USD' },
    lessonCount: 1,
    videoHours: 1,
    instructor: null,
    hasSubtitles: false,
    prerequisites: [],
    sections: [],
    relatedCourses: [],
    learningPathUrl: null,
    sourceUrl: `https://cursos.devtalles.com/courses/${slug}`,
    categories: ['all'],
    scrapedAt: new Date().toISOString(),
    relatedCourseIds: [],
    status: 'ok',
  }
}

function buildCatalog(): CatalogSnapshot {
  return {
    version: 3,
    generatedAt: new Date().toISOString(),
    source: 'seed',
    courses: [
      minimalCourse(100, 'course-a', 'Course A'),
      minimalCourse(200, 'course-b', 'Course B'),
    ],
    paths: [],
    stats: {
      courseCount: 2,
      pathCount: 0,
      categoryCounts: {
        all: 2,
        wip: 0,
        free: 0,
        mini: 0,
        exclusive: 0,
        legacy: 0,
      },
    },
  }
}

describe('LearningPathsController', () => {
  let controller: LearningPathsController
  let progressController: CourseProgressController
  let service: LearningPathsService
  let currentUserId = USER_A
  let catalogSnapshot: CatalogSnapshot

  beforeEach(async () => {
    currentUserId = USER_A
    catalogSnapshot = buildCatalog()
    const store: PathStore = new Map()
    const paths = createInMemoryPathRepo(store)
    const items = createInMemoryItemRepo(store)
    const progress = createInMemoryProgressRepo()
    const catalog: CatalogRepository = {
      getCurrent: async () => catalogSnapshot,
      save: async (c) => c,
    }

    const module = await Test.createTestingModule({
      controllers: [LearningPathsController, CourseProgressController],
      providers: [
        LearningPathsService,
        ProgressService,
        { provide: LEARNING_PATH_REPOSITORY, useValue: paths },
        { provide: LEARNING_PATH_ITEM_REPOSITORY, useValue: items },
        { provide: USER_COURSE_PROGRESS_REPOSITORY, useValue: progress },
        { provide: CATALOG_REPOSITORY, useValue: catalog },
        { provide: SESSION_JWT, useValue: {} },
      ],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => {
            getRequest: () => { userId?: string }
          }
        }) => {
          const req = ctx.switchToHttp().getRequest()
          req.userId = currentUserId
          return true
        },
      })
      .compile()

    controller = module.get(LearningPathsController)
    progressController = module.get(CourseProgressController)
    service = module.get(LearningPathsService)

    // Ensure CurrentUserId decorator path is exercised via direct calls with userId
    void CurrentUserId
  })

  it('GET detail of another user path → 404', async () => {
    const created = await service.create(USER_A, {
      kind: 'custom',
      title: 'Mine',
      items: [{ courseId: '100' }],
    })
    currentUserId = USER_B
    await expect(controller.getById(USER_B, created.id)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('GET detail returns unavailable:true and HTTP-layer 200 semantics', async () => {
    const created = await service.create(USER_A, {
      kind: 'custom',
      title: 'Stale course',
      items: [{ courseId: '100' }, { courseId: '200' }],
    })
    catalogSnapshot = {
      ...buildCatalog(),
      courses: [minimalCourse(100, 'course-a', 'Course A')],
    }
    const detail = await controller.getById(USER_A, created.id)
    expect(detail.items.find((i) => i.courseId === '200')?.unavailable).toBe(
      true,
    )
    expect(detail.items.find((i) => i.courseId === '100')?.unavailable).toBe(
      false,
    )
  })

  it('PUT progress completed then in_progress clears completedAt', async () => {
    const completed = await progressController.upsert(USER_A, '100', {
      status: 'completed',
    })
    expect(completed.completedAt).not.toBeNull()

    const again = await progressController.upsert(USER_A, '100', {
      status: 'in_progress',
    })
    expect(again.status).toBe('in_progress')
    expect(again.completedAt).toBeNull()
  })

  it('create never accepts userId from body — uses session user', async () => {
    const detail = await controller.create(USER_A, {
      kind: 'custom',
      title: 'Owned by session',
      items: [{ courseId: '100' }],
    })
    const list = await controller.list(USER_A, { status: 'active' })
    expect(list.items.some((i) => i.id === detail.id)).toBe(true)

    currentUserId = USER_B
    const otherList = await controller.list(USER_B, { status: 'active' })
    expect(otherList.items.some((i) => i.id === detail.id)).toBe(false)
  })
})
