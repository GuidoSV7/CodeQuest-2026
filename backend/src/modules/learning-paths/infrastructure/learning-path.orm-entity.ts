import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import type {
  LearningPathKind,
  LearningPathStatus,
} from '../ports/learning-path.ports'
import { LearningPathItemOrmEntity } from './learning-path-item.orm-entity'

@Entity({ name: 'learning_paths' })
@Check(
  'learning_paths_official_source_chk',
  `(kind <> 'official') OR (source_catalog_path_id IS NOT NULL)`,
)
export class LearningPathOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Column({ type: 'varchar', length: 200 })
  title!: string

  @Column({
    type: 'enum',
    enum: ['generated', 'official', 'custom'],
    enumName: 'learning_path_kind',
  })
  kind!: LearningPathKind

  @Column({ name: 'questionnaire_response_id', type: 'uuid', nullable: true })
  questionnaireResponseId!: string | null

  @Column({ name: 'catalog_version', type: 'int' })
  catalogVersion!: number

  @Column({
    type: 'enum',
    enum: ['active', 'archived'],
    enumName: 'learning_path_status',
    default: 'active',
  })
  status!: LearningPathStatus

  @Column({ name: 'source_catalog_path_id', type: 'varchar', length: 128, nullable: true })
  sourceCatalogPathId!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @OneToMany(() => LearningPathItemOrmEntity, (i) => i.learningPath, {
    cascade: false,
  })
  items!: LearningPathItemOrmEntity[]
}
