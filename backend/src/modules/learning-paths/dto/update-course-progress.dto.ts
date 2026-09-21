import { IsIn } from 'class-validator'

export class UpdateCourseProgressDto {
  @IsIn(['not_started', 'in_progress', 'completed'])
  status!: 'not_started' | 'in_progress' | 'completed'
}
