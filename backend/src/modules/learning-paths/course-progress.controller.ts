import { Body, Controller, Inject, Param, Put, UseGuards } from '@nestjs/common'
import { CurrentUserId } from '../identity/presentation/current-user.decorator'
import { SessionAuthGuard } from '../identity/presentation/session-auth.guard'
import { UpdateCourseProgressDto } from './dto/update-course-progress.dto'
import { ProgressService } from './progress.service'

@Controller('me/courses')
@UseGuards(SessionAuthGuard)
export class CourseProgressController {
  constructor(
    @Inject(ProgressService) private readonly progress: ProgressService,
  ) {}

  @Put(':courseId/progress')
  upsert(
    @CurrentUserId() userId: string,
    @Param('courseId') courseId: string,
    @Body() dto: UpdateCourseProgressDto,
  ) {
    return this.progress.upsert(userId, courseId, dto.status)
  }
}
