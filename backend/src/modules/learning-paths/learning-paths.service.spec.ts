import { beforeEach, describe, expect, it } from 'vitest'
import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import type { CatalogRepository } from '../catalog-scraper/ports/catalog-repository.port'
import { LearningPathsService } from './learning-paths.service'
import type {
  LearningPathItemRepository,
  LearningPathRepository,
  UserCourseProgressRepository,
} from './ports/learning-path.ports'
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

function buildCatalog(overrides?: Partial<CatalogSnapshot>): CatalogSnapshot {
  return {
    version: 7,
    generatedAt: new Date().toISOString(),
    source: 'seed',
    courses: [
      minimalCourse(100, 'course-a', 'Course A'),
      minimalCourse(200, 'course-b', 'Course B'),
      minimalCourse(300, 'course-c', 'Course C'),
    ],
    paths: [
      {
        id: 'programas-react',
        title: 'Ruta React',
        pagePath: '/pages/programas-react',
        scrapedAt: new Date().toISOString(),
        entries: [
          {
            bucket: 'REQUIRED',
            courseSlug: 'course-a',
            courseUrl: 'https://cursos.devtalles.com/courses/course-a',
            label: 'Course A',
            tags: [],
            position: 0,
            courseId: 100,
          },
          {
            bucket: 'RECOMMENDED',
            courseSlug: 'course-b',
            courseUrl: 'https://cursos.devtalles.com/courses/course-b',
            label: 'Course B',
            tags: [],
            position: 1,
            courseId: 200,
          },
        ],
        buckets: {
          REQUIRED: [],
          RECOMMENDED: [],
          OPTIONAL: [],
          ANYTIME: [],
        },
      },
    ],
    stats: {
      courseCount: 3,
      pathCount: 1,
      categoryCounts: {
        all: 3,
        wip: 0,
        free: 0,
        mini: 0,
        exclusive: 0,
        legacy: 0,
      },
    },
    ...overrides,
  }
}

describe('LearningPathsService', () => {
  let service: LearningPathsService
  let store: PathStore
  let paths: LearningPathRepository
  let items: LearningPathItemRepository
  let progress: UserCourseProgressRepository
  let catalog: CatalogRepository
  let catalogSnapshot: CatalogSnapshot | null
  let catalogFails = false

  beforeEach(() => {
    catalogSnapshot = buildCatalog()
    catalogFails = false
    store = new Map()
    paths = createInMemoryPathRepo(store)
    items = createInMemoryItemRepo(store)
    progress = createInMemoryProgressRepo()
    catalog = {
      getCurrent: async () => {
        if (catalogFails) throw new Error('redis down')
        return catalogSnapshot
      },
      save: async (c) => c,
    }
    service = new LearningPathsService(paths, items, progress, catalog)
  })

  it('creates a custom path with catalog snapshots and contiguous positions', async () => {
    const detail = await service.create(USER_A, {
      kind: 'custom',
      title: 'My path',
      items: [{ courseId: '100' }, { courseId: '200', bucket: 'optional' }],
    })

    expect(detail.kind).toBe('custom')
    expect(detail.catalogVersion).toBe(7)
    expect(detail.itemCount).toBe(2)
    expect(detail.items[0]).toMatchObject({
      courseId: '100',
      courseSlug: 'course-a',
      courseTitle: 'Course A',
      position: 0,
      unavailable: false,
    })
    expect(detail.items[1]?.position).toBe(1)
    expect(detail.progressRatio).toBe(0)
  })

  it('rejects duplicate courseIds on create with 422', async () => {
    await expect(
      service.create(USER_A, {
        kind: 'custom',
        title: 'Dup',
        items: [{ courseId: '100' }, { courseId: '100' }],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)
  })

  it('rejects course not in catalog with 422', async () => {
    await expect(
      service.create(USER_A, {
        kind: 'custom',
        title: 'Missing',
        items: [{ courseId: '999' }],
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'COURSE_NOT_IN_CATALOG' }),
    })
  })

  it('creates official path from catalogPathId copying order and buckets', async () => {
    const detail = await service.create(USER_A, {
      kind: 'official',
      catalogPathId: 'programas-react',
    })

    expect(detail.kind).toBe('official')
    expect(detail.title).toBe('Ruta React')
    expect(detail.sourceCatalogPathId).toBe('programas-react')
    expect(detail.items.map((i) => i.courseId)).toEqual(['100', '200'])
    expect(detail.items[0]?.bucket).toBe('required')
    expect(detail.items[1]?.bucket).toBe('recommended')
  })

  it('returns 404 when catalog path is missing', async () => {
    await expect(
      service.create(USER_A, {
        kind: 'official',
        catalogPathId: 'does-not-exist',
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('returns 503 when catalog is unavailable on create', async () => {
    catalogFails = true
    await expect(
      service.create(USER_A, { kind: 'custom', title: 'X' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it('lists paths with progressRatio', async () => {
    const created = await service.create(USER_A, {
      kind: 'custom',
      title: 'Progress path',
      items: [{ courseId: '100' }, { courseId: '200' }],
    })
    await progress.upsertStatus(USER_A, '100', 'completed')

    const list = await service.list(USER_A, 'active')
    expect(list.items).toHaveLength(1)
    expect(list.items[0]?.id).toBe(created.id)
    expect(list.items[0]?.completedCount).toBe(1)
    expect(list.items[0]?.progressRatio).toBe(0.5)
  })

  it('get detail marks unavailable when course missing from catalog', async () => {
    const created = await service.create(USER_A, {
      kind: 'custom',
      title: 'Stale',
      items: [{ courseId: '100' }, { courseId: '200' }],
    })
    catalogSnapshot = buildCatalog({
      courses: [minimalCourse(100, 'course-a', 'Course A')],
    })

    const detail = await service.getById(USER_A, created.id)
    expect(detail.items.find((i) => i.courseId === '100')?.unavailable).toBe(
      false,
    )
    expect(detail.items.find((i) => i.courseId === '200')?.unavailable).toBe(
      true,
    )
  })

  it('get detail of another user path throws NotFoundException', async () => {
    const created = await service.create(USER_A, {
      kind: 'custom',
      title: 'Private',
    })
    await expect(service.getById(USER_B, created.id)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('degrades unavailable to false when catalog getCurrent throws on GET', async () => {
    const created = await service.create(USER_A, {
      kind: 'custom',
      title: 'Degrade',
      items: [{ courseId: '100' }],
    })
    catalogFails = true
    const detail = await service.getById(USER_A, created.id)
    expect(detail.items[0]?.unavailable).toBe(false)
  })

  it('add item returns detail; duplicate course → 409', async () => {
    const created = await service.create(USER_A, {
      kind: 'custom',
      title: 'Add',
      items: [{ courseId: '100' }],
    })
    const after = await service.addItem(USER_A, created.id, {
      courseId: '200',
    })
    expect(after.itemCount).toBe(2)

    await expect(
      service.addItem(USER_A, created.id, { courseId: '100' }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('reorder rejects non-permutation with 422', async () => {
    const created = await service.create(USER_A, {
      kind: 'custom',
      title: 'Order',
      items: [{ courseId: '100' }, { courseId: '200' }],
    })
    await expect(
      service.reorderItems(USER_A, created.id, {
        orderedItemIds: [created.items[0]!.id],
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_ORDER' }),
    })
  })

  it('remove item renumbers positions', async () => {
    const created = await service.create(USER_A, {
      kind: 'custom',
      title: 'Remove',
      items: [{ courseId: '100' }, { courseId: '200' }, { courseId: '300' }],
    })
    const mid = created.items.find((i) => i.courseId === '200')!
    await service.removeItem(USER_A, created.id, mid.id)
    const detail = await service.getById(USER_A, created.id)
    expect(detail.items.map((i) => i.courseId)).toEqual(['100', '300'])
    expect(detail.items.map((i) => i.position)).toEqual([0, 1])
  })
})
