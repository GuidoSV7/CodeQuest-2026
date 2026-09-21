import {
  Check,
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'
import type { CourseProgressStatus } from '../ports/learning-path.ports'

@Entity({ name: 'user_course_progress' })
@Check(
  'user_course_progress_completed_chk',
  `(status = 'completed' AND completed_at IS NOT NULL) OR (status <> 'completed' AND completed_at IS NULL)`,
)
@Check(
  'user_course_progress_started_chk',
  `(status = 'not_started' AND started_at IS NULL) OR (status <> 'not_started')`,
)
export class UserCourseProgressOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string

  @PrimaryColumn({ name: 'course_id', type: 'varchar', length: 32 })
  courseId!: string

  @Column({
    type: 'enum',
    enum: ['not_started', 'in_progress', 'completed'],
    enumName: 'course_progress_status',
    default: 'not_started',
  })
  status!: CourseProgressStatus

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
