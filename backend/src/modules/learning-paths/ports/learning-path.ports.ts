export type LearningPathKind = 'generated' | 'official' | 'custom'
export type LearningPathStatus = 'active' | 'archived'
export type PathItemBucket =
  | 'required'
  | 'recommended'
  | 'optional'
  | 'anytime'
export type CourseProgressStatus = 'not_started' | 'in_progress' | 'completed'

export type LearningPathItemRecord = {
  id: string
  learningPathId: string
  courseId: string
  courseSlug: string
  courseTitle: string
  position: number
  bucket: PathItemBucket | null
  createdAt: Date
}

export type LearningPathRecord = {
  id: string
  userId: string
  title: string
  kind: LearningPathKind
  questionnaireResponseId: string | null
  catalogVersion: number
  status: LearningPathStatus
  sourceCatalogPathId: string | null
  createdAt: Date
  updatedAt: Date
  items: LearningPathItemRecord[]
}

export type CreateLearningPathItemInput = {
  courseId: string
  courseSlug: string
  courseTitle: string
  position: number
  bucket: PathItemBucket | null
}

export type CreateLearningPathInput = {
  userId: string
  title: string
  kind: LearningPathKind
  catalogVersion: number
  status: LearningPathStatus
  questionnaireResponseId: string | null
  sourceCatalogPathId: string | null
  items: CreateLearningPathItemInput[]
}

export type LearningPathRepository = {
  create(input: CreateLearningPathInput): Promise<LearningPathRecord>
  listByUser(
    userId: string,
    status: LearningPathStatus | 'all',
  ): Promise<LearningPathRecord[]>
  findByIdForUser(
    pathId: string,
    userId: string,
  ): Promise<LearningPathRecord | null>
  archive(pathId: string, userId: string): Promise<LearningPathRecord>
  setStatus(
    pathId: string,
    userId: string,
    status: LearningPathStatus,
  ): Promise<LearningPathRecord>
  delete(pathId: string, userId: string): Promise<void>
  updateTitle(
    pathId: string,
    userId: string,
    title: string,
  ): Promise<LearningPathRecord>
}

export const LEARNING_PATH_REPOSITORY = Symbol('LEARNING_PATH_REPOSITORY')

export type AddPathItemInput = {
  courseId: string
  courseSlug: string
  courseTitle: string
  bucket: PathItemBucket | null
  position?: number
}

export type LearningPathItemRepository = {
  add(
    pathId: string,
    userId: string,
    input: AddPathItemInput,
  ): Promise<LearningPathItemRecord>
  remove(pathId: string, userId: string, itemId: string): Promise<void>
  reorder(
    pathId: string,
    userId: string,
    orderedItemIds: string[],
  ): Promise<void>
}

export const LEARNING_PATH_ITEM_REPOSITORY = Symbol(
  'LEARNING_PATH_ITEM_REPOSITORY',
)

export type UserCourseProgressRecord = {
  userId: string
  courseId: string
  status: CourseProgressStatus
  startedAt: Date | null
  completedAt: Date | null
  updatedAt: Date
}

export type UserCourseProgressRepository = {
  upsertStatus(
    userId: string,
    courseId: string,
    status: CourseProgressStatus,
  ): Promise<UserCourseProgressRecord>
  findByCourseIds(
    userId: string,
    courseIds: string[],
  ): Promise<Map<string, UserCourseProgressRecord>>
}

export const USER_COURSE_PROGRESS_REPOSITORY = Symbol(
  'USER_COURSE_PROGRESS_REPOSITORY',
)
