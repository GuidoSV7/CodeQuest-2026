import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import type { PathItemBucket } from '../ports/learning-path.ports'
import { LearningPathOrmEntity } from './learning-path.orm-entity'

@Entity({ name: 'learning_path_items' })
@Unique('learning_path_items_path_course_uidx', ['learningPathId', 'courseId'])
@Unique('learning_path_items_path_position_uidx', ['learningPathId', 'position'])
@Check('learning_path_items_position_chk', `"position" >= 0`)
export class LearningPathItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'learning_path_id', type: 'uuid' })
  learningPathId!: string

  @ManyToOne(() => LearningPathOrmEntity, (p) => p.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'learning_path_id' })
  learningPath!: LearningPathOrmEntity

  @Column({ name: 'course_id', type: 'varchar', length: 32 })
  courseId!: string

  @Column({ name: 'course_slug', type: 'varchar', length: 256 })
  courseSlug!: string

  @Column({ name: 'course_title', type: 'varchar', length: 256 })
  courseTitle!: string

  @Column({ type: 'int' })
  position!: number

  @Column({
    type: 'enum',
    enum: ['required', 'recommended', 'optional', 'anytime'],
    enumName: 'path_item_bucket',
    nullable: true,
  })
  bucket!: PathItemBucket | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
