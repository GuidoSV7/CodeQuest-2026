import {
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common'
import {
  USER_COURSE_PROGRESS_REPOSITORY,
  type CourseProgressStatus,
  type UserCourseProgressRepository,
} from './ports/learning-path.ports'
import {
  toProgressDto,
  type CourseProgressDto,
} from './learning-paths.service'

const COURSE_ID_PATTERN = /^\d+$/

@Injectable()
export class ProgressService {
  constructor(
    @Inject(USER_COURSE_PROGRESS_REPOSITORY)
    private readonly progress: UserCourseProgressRepository,
  ) {}

  async upsert(
    userId: string,
    courseId: string,
    status: CourseProgressStatus,
  ): Promise<CourseProgressDto> {
    if (!COURSE_ID_PATTERN.test(courseId)) {
      throw new UnprocessableEntityException({
        code: 'INVALID_COURSE_ID',
        message: 'courseId must be a numeric decimal string',
      })
    }
    const row = await this.progress.upsertStatus(userId, courseId, status)
    return toProgressDto(courseId, row)
  }
}
