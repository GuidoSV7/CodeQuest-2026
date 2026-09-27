import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { toCourseCard, type CourseCard } from '../catalog-scraper/application/course-card'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from '../catalog-scraper/ports/catalog-repository.port'
import type { CreateLearningPathDto } from './dto/create-learning-path.dto'
import type { UpdateLearningPathDto } from './dto/update-learning-path.dto'
import type { AddPathItemDto } from './dto/add-path-item.dto'
import type { ReorderPathItemsDto } from './dto/reorder-path-items.dto'
import {
  LEARNING_PATH_EVENTS,
  LearningPathEventHub,
} from './learning-path-event.hub'
import {
  LEARNING_PATH_ITEM_REPOSITORY,
  LEARNING_PATH_REPOSITORY,
  USER_COURSE_PROGRESS_REPOSITORY,
  type CourseProgressStatus,
  type LearningPathItemRecord,
  type LearningPathItemRepository,
  type LearningPathRecord,
  type LearningPathRepository,
  type LearningPathStatus,
  type PathItemBucket,
  type UserCourseProgressRecord,
  type UserCourseProgressRepository,
} from './ports/learning-path.ports'

export type CourseProgressDto = {
  courseId: string
  status: CourseProgressStatus
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
}

export type LearningPathCourseCardDto = CourseCard

export type LearningPathItemDto = {
  id: string
  courseId: string
  courseSlug: string
  courseTitle: string
  position: number
  bucket: PathItemBucket | null
  unavailable: boolean
  progress: CourseProgressDto
  detail: LearningPathCourseCardDto | null
}

function courseCard(
  catalog: CatalogSnapshot | 'degraded',
  courseId: string,
): LearningPathCourseCardDto | null {
  if (catalog === 'degraded') return null
  return toCourseCard(catalog, courseId)
}

export type LearningPathSummaryDto = {
  id: string
  title: string
  kind: LearningPathRecord['kind']
  status: LearningPathStatus
  catalogVersion: number
  sourceCatalogPathId: string | null
  itemCount: number
  completedCount: number
  progressRatio: number
  createdAt: string
  updatedAt: string
}

export type LearningPathDetailDto = LearningPathSummaryDto & {
  questionnaireResponseId: string | null
  items: LearningPathItemDto[]
}

const BUCKET_FROM_CATALOG: Record<string, PathItemBucket> = {
  REQUIRED: 'required',
  RECOMMENDED: 'recommended',
  OPTIONAL: 'optional',
  ANYTIME: 'anytime',
}

@Injectable()
export class LearningPathsService {
  private readonly logger = new Logger(LearningPathsService.name)

  constructor(
    @Inject(LEARNING_PATH_REPOSITORY)
    private readonly paths: LearningPathRepository,
    @Inject(LEARNING_PATH_ITEM_REPOSITORY)
    private readonly items: LearningPathItemRepository,
    @Inject(USER_COURSE_PROGRESS_REPOSITORY)
    private readonly progress: UserCourseProgressRepository,
    @Inject(CATALOG_REPOSITORY)
    private readonly catalog: CatalogRepository,
    @Optional()
    @Inject(LEARNING_PATH_EVENTS)
    private readonly events?: LearningPathEventHub,
  ) {}

  async list(
    userId: string,
    status: LearningPathStatus | 'all' = 'active',
  ): Promise<{ items: LearningPathSummaryDto[] }> {
    const records = await this.paths.listByUser(userId, status)
    const courseIds = [
      ...new Set(records.flatMap((r) => r.items.map((i) => i.courseId))),
    ]
    const progressMap = await this.progress.findByCourseIds(userId, courseIds)
    return {
      items: records.map((r) => this.toSummary(r, progressMap)),
    }
  }

  async getById(userId: string, pathId: string): Promise<LearningPathDetailDto> {
    const record = await this.requireOwnedPath(pathId, userId)
    return this.toDetail(userId, record, await this.loadCatalogForRead())
  }

  async create(
    userId: string,
    dto: CreateLearningPathDto,
  ): Promise<LearningPathDetailDto> {
    const snapshot = await this.requireCatalogForWrite()

    if (dto.kind === 'custom') {
      return this.createCustom(userId, dto, snapshot)
    }
    return this.createOfficial(userId, dto, snapshot)
  }

  async update(
    userId: string,
    pathId: string,
    dto: UpdateLearningPathDto,
  ): Promise<LearningPathDetailDto> {
    await this.requireOwnedPath(pathId, userId)
    try {
      if (dto.title !== undefined) {
        await this.paths.updateTitle(pathId, userId, dto.title)
      }
      if (dto.status !== undefined) {
        await this.paths.setStatus(pathId, userId, dto.status)
      }
    } catch (err) {
      this.rethrowNotFound(err)
    }
    return this.getById(userId, pathId)
  }

  async remove(userId: string, pathId: string): Promise<void> {
    await this.requireOwnedPath(pathId, userId)
    try {
      await this.paths.delete(pathId, userId)
    } catch (err) {
      this.rethrowNotFound(err)
    }
  }

  async addItem(
    userId: string,
    pathId: string,
    dto: AddPathItemDto,
  ): Promise<LearningPathDetailDto> {
    const path = await this.requireOwnedPath(pathId, userId)
    if (path.items.some((i) => i.courseId === dto.courseId)) {
      throw new ConflictException({
        code: 'COURSE_ALREADY_IN_PATH',
        message: 'Course is already in this learning path',
      })
    }
    const snapshot = await this.requireCatalogForWrite()
    const course = this.findCourse(snapshot, dto.courseId)
    if (!course) {
      throw new UnprocessableEntityException({
        code: 'COURSE_NOT_IN_CATALOG',
        message: `Course ${dto.courseId} is not in the current catalog`,
      })
    }
    try {
      await this.items.add(pathId, userId, {
        courseId: dto.courseId,
        courseSlug: course.slug,
        courseTitle: course.title,
        bucket: dto.bucket ?? null,
        position: dto.position,
      })
    } catch (err) {
      this.rethrowItemErrors(err)
    }
    return this.getById(userId, pathId)
  }

  async removeItem(
    userId: string,
    pathId: string,
    itemId: string,
  ): Promise<void> {
    await this.requireOwnedPath(pathId, userId)
    try {
      await this.items.remove(pathId, userId, itemId)
    } catch (err) {
      this.rethrowItemErrors(err)
    }
  }

  async reorderItems(
    userId: string,
    pathId: string,
    dto: ReorderPathItemsDto,
  ): Promise<LearningPathDetailDto> {
    await this.requireOwnedPath(pathId, userId)
    try {
      await this.items.reorder(pathId, userId, dto.orderedItemIds)
    } catch (err) {
      this.rethrowItemErrors(err)
    }
    return this.getById(userId, pathId)
  }

  private async createCustom(
    userId: string,
    dto: CreateLearningPathDto,
    snapshot: CatalogSnapshot,
  ): Promise<LearningPathDetailDto> {
    if (!dto.title) {
      throw new UnprocessableEntityException({
        code: 'TITLE_REQUIRED',
        message: 'title is required for custom learning paths',
      })
    }
    const rawItems = dto.items ?? []
    this.assertNoDuplicateCourseIds(rawItems.map((i) => i.courseId))
    const items = rawItems.map((item, position) => {
      const course = this.findCourse(snapshot, item.courseId)
      if (!course) {
        throw new UnprocessableEntityException({
          code: 'COURSE_NOT_IN_CATALOG',
          message: `Course ${item.courseId} is not in the current catalog`,
        })
      }
      return {
        courseId: item.courseId,
        courseSlug: course.slug,
        courseTitle: course.title,
        position,
        bucket: item.bucket ?? null,
      }
    })

    const created = await this.paths.create({
      userId,
      title: dto.title,
      kind: 'custom',
      catalogVersion: snapshot.version,
      status: 'active',
      questionnaireResponseId: null,
      sourceCatalogPathId: null,
      items,
    })
    return this.announce(userId, await this.toDetail(userId, created, snapshot))
  }

  async saveGenerated(
    userId: string,
    input: {
      title?: string
      courseIds: string[]
      buckets?: Array<PathItemBucket | null>
      sourcePathId?: string | null
    },
  ): Promise<LearningPathDetailDto> {
    const snapshot = await this.requireCatalogForWrite()
    this.assertNoDuplicateCourseIds(input.courseIds)
    const items = input.courseIds.map((courseId, position) => {
      const course = this.findCourse(snapshot, courseId)
      if (!course || course.status !== 'ok') {
        throw new UnprocessableEntityException({
          code: 'COURSE_NOT_IN_CATALOG',
          message: `Course ${courseId} is not in the current catalog`,
        })
      }
      return {
        courseId,
        courseSlug: course.slug,
        courseTitle: course.title,
        position,
        bucket: input.buckets?.[position] ?? null,
      }
    })
    const source = input.sourcePathId && snapshot.paths.some((path) => path.id === input.sourcePathId)
      ? input.sourcePathId
      : null
    const created = await this.paths.create({
      userId,
      title: input.title?.trim() || 'Ruta generada',
      kind: 'generated',
      catalogVersion: snapshot.version,
      status: 'active',
      questionnaireResponseId: null,
      sourceCatalogPathId: source,
      items,
    })
    return this.announce(userId, await this.toDetail(userId, created, snapshot))
  }

  private async createOfficial(
    userId: string,
    dto: CreateLearningPathDto,
    snapshot: CatalogSnapshot,
  ): Promise<LearningPathDetailDto> {
    if (!dto.catalogPathId) {
      throw new UnprocessableEntityException({
        code: 'CATALOG_PATH_ID_REQUIRED',
        message: 'catalogPathId is required for official learning paths',
      })
    }
    const catalogPath = snapshot.paths.find((p) => p.id === dto.catalogPathId)
    if (!catalogPath) {
      throw new NotFoundException({
        code: 'CATALOG_PATH_NOT_FOUND',
        message: `Catalog path ${dto.catalogPathId} was not found`,
      })
    }

    const coursesBySlug = new Map(
      snapshot.courses.map((c) => [c.slug, c] as const),
    )
    const items = catalogPath.entries.map((entry, position) => {
      const courseId =
        entry.courseId != null
          ? String(entry.courseId)
          : coursesBySlug.get(entry.courseSlug)
            ? String(coursesBySlug.get(entry.courseSlug)!.id)
            : null
      if (!courseId) {
        throw new UnprocessableEntityException({
          code: 'COURSE_NOT_IN_CATALOG',
          message: `Path entry slug ${entry.courseSlug} has no course id in catalog`,
        })
      }
      const course =
        this.findCourse(snapshot, courseId) ??
        coursesBySlug.get(entry.courseSlug)
      if (!course) {
        throw new UnprocessableEntityException({
          code: 'COURSE_NOT_IN_CATALOG',
          message: `Course ${courseId} is not in the current catalog`,
        })
      }
      return {
        courseId: String(course.id),
        courseSlug: course.slug,
        courseTitle: course.title,
        position,
        bucket: BUCKET_FROM_CATALOG[entry.bucket] ?? null,
      }
    })

    this.assertNoDuplicateCourseIds(items.map((i) => i.courseId))

    const created = await this.paths.create({
      userId,
      title: dto.title ?? catalogPath.title,
      kind: 'official',
      catalogVersion: snapshot.version,
      status: 'active',
      questionnaireResponseId: null,
      sourceCatalogPathId: catalogPath.id,
      items,
    })
    return this.announce(userId, await this.toDetail(userId, created, snapshot))
  }

  private async requireOwnedPath(
    pathId: string,
    userId: string,
  ): Promise<LearningPathRecord> {
    const path = await this.paths.findByIdForUser(pathId, userId)
    if (!path) {
      throw new NotFoundException('Learning path not found')
    }
    return path
  }

  private async requireCatalogForWrite(): Promise<CatalogSnapshot> {
    try {
      const snapshot = await this.catalog.getCurrent()
      if (!snapshot) {
        throw new ServiceUnavailableException({
          code: 'CATALOG_UNAVAILABLE',
          message: 'Catalog is not available',
        })
      }
      return snapshot
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err
      this.logger.warn(
        `Catalog unavailable for write: ${err instanceof Error ? err.message : String(err)}`,
      )
      throw new ServiceUnavailableException({
        code: 'CATALOG_UNAVAILABLE',
        message: 'Catalog is not available',
      })
    }
  }

  /** Spec §6: on GET, degrade when Redis fails — unavailable:false + warn. */
  private async loadCatalogForRead(): Promise<CatalogSnapshot | 'degraded'> {
    try {
      const snapshot = await this.catalog.getCurrent()
      return snapshot ?? emptyCatalog()
    } catch (err) {
      this.logger.warn(
        `Catalog unreachable on read; degrading unavailable flags: ${err instanceof Error ? err.message : String(err)}`,
      )
      return 'degraded'
    }
  }

  private findCourse(snapshot: CatalogSnapshot, courseId: string) {
    return snapshot.courses.find((c) => String(c.id) === courseId)
  }

  private assertNoDuplicateCourseIds(courseIds: string[]): void {
    const seen = new Set<string>()
    for (const id of courseIds) {
      if (seen.has(id)) {
        throw new UnprocessableEntityException({
          code: 'DUPLICATE_COURSE_IN_PATH',
          message: `Duplicate courseId ${id} in path`,
        })
      }
      seen.add(id)
    }
  }

  private announce(userId: string, detail: LearningPathDetailDto): LearningPathDetailDto {
    this.events?.publishPathCreated(userId, { id: detail.id, title: detail.title })
    return detail
  }

  private async toDetail(
    userId: string,
    record: LearningPathRecord,
    catalog: CatalogSnapshot | 'degraded',
  ): Promise<LearningPathDetailDto> {
    const progressMap = await this.progress.findByCourseIds(
      userId,
      record.items.map((i) => i.courseId),
    )
    const items = record.items
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((item) => this.toItemDto(item, progressMap, catalog))

    const summary = this.toSummary(record, progressMap)
    return {
      ...summary,
      questionnaireResponseId: record.questionnaireResponseId,
      items,
    }
  }

  private toSummary(
    record: LearningPathRecord,
    progressMap: Map<string, UserCourseProgressRecord>,
  ): LearningPathSummaryDto {
    const itemCount = record.items.length
    const completedCount = record.items.filter(
      (i) => progressMap.get(i.courseId)?.status === 'completed',
    ).length
    return {
      id: record.id,
      title: record.title,
      kind: record.kind,
      status: record.status,
      catalogVersion: record.catalogVersion,
      sourceCatalogPathId: record.sourceCatalogPathId,
      itemCount,
      completedCount,
      progressRatio: itemCount === 0 ? 0 : completedCount / itemCount,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }
  }

  private toItemDto(
    item: LearningPathItemRecord,
    progressMap: Map<string, UserCourseProgressRecord>,
    catalog: CatalogSnapshot | 'degraded',
  ): LearningPathItemDto {
    const progress = progressMap.get(item.courseId)
    const availableIds =
      catalog === 'degraded'
        ? null
        : new Set(catalog.courses.map((course) => String(course.id)))
    return {
      id: item.id,
      courseId: item.courseId,
      courseSlug: item.courseSlug,
      courseTitle: item.courseTitle,
      position: item.position,
      bucket: item.bucket,
      unavailable:
        availableIds === null ? false : !availableIds.has(item.courseId),
      progress: toProgressDto(item.courseId, progress),
      detail: courseCard(catalog, item.courseId),
    }
  }

  private rethrowNotFound(err: unknown): never {
    if (err instanceof Error && err.message.includes('not found')) {
      throw new NotFoundException('Learning path not found')
    }
    throw err
  }

  private rethrowItemErrors(err: unknown): never {
    if (!(err instanceof Error)) throw err
    if (err.message.includes('not found')) {
      throw new NotFoundException('Learning path not found')
    }
    if (err.message === 'COURSE_ALREADY_IN_PATH') {
      throw new ConflictException({
        code: 'COURSE_ALREADY_IN_PATH',
        message: 'Course is already in this learning path',
      })
    }
    if (err.message === 'INVALID_ORDER') {
      throw new UnprocessableEntityException({
        code: 'INVALID_ORDER',
        message: 'orderedItemIds must be a permutation of all path item ids',
      })
    }
    throw err
  }
}

export function toProgressDto(
  courseId: string,
  row: UserCourseProgressRecord | undefined,
): CourseProgressDto {
  if (!row) {
    return {
      courseId,
      status: 'not_started',
      startedAt: null,
      completedAt: null,
      updatedAt: new Date(0).toISOString(),
    }
  }
  return {
    courseId: row.courseId,
    status: row.status,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }
}

function emptyCatalog(): CatalogSnapshot {
  return {
    version: 0,
    generatedAt: new Date(0).toISOString(),
    source: 'seed',
    courses: [],
    paths: [],
    stats: {
      courseCount: 0,
      pathCount: 0,
      categoryCounts: {
        all: 0,
        wip: 0,
        free: 0,
        mini: 0,
        exclusive: 0,
        legacy: 0,
      },
    },
  }
}
