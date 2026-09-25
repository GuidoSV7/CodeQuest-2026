import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { CatalogScraperModule } from '../catalog-scraper/nest/catalog-scraper.module'
import { IdentityModule } from '../identity/identity.module'
import { CourseProgressController } from './course-progress.controller'
import { LearningPathItemOrmEntity } from './infrastructure/learning-path-item.orm-entity'
import { LearningPathOrmEntity } from './infrastructure/learning-path.orm-entity'
import { createTypeormLearningPathItemRepository } from './infrastructure/typeorm-learning-path-item.repository'
import { createTypeormLearningPathRepository } from './infrastructure/typeorm-learning-path.repository'
import { createTypeormUserCourseProgressRepository } from './infrastructure/typeorm-user-course-progress.repository'
import { UserCourseProgressOrmEntity } from './infrastructure/user-course-progress.orm-entity'
import { LearningPathsController } from './learning-paths.controller'
import { LearningPathsService } from './learning-paths.service'
import {
  LEARNING_PATH_ITEM_REPOSITORY,
  LEARNING_PATH_REPOSITORY,
  USER_COURSE_PROGRESS_REPOSITORY,
} from './ports/learning-path.ports'
import { ProgressService } from './progress.service'
import { LEARNING_PATH_EVENTS, LearningPathEventHub } from './learning-path-event.hub'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LearningPathOrmEntity,
      LearningPathItemOrmEntity,
      UserCourseProgressOrmEntity,
    ]),
    IdentityModule,
    CatalogScraperModule,
  ],
  controllers: [LearningPathsController, CourseProgressController],
  providers: [
    {
      provide: LEARNING_PATH_REPOSITORY,
      inject: [DataSource],
      useFactory: (ds: DataSource) => createTypeormLearningPathRepository(ds),
    },
    {
      provide: LEARNING_PATH_ITEM_REPOSITORY,
      inject: [DataSource],
      useFactory: (ds: DataSource) =>
        createTypeormLearningPathItemRepository(ds),
    },
    {
      provide: USER_COURSE_PROGRESS_REPOSITORY,
      inject: [DataSource],
      useFactory: (ds: DataSource) =>
        createTypeormUserCourseProgressRepository(ds),
    },
    LearningPathsService,
    ProgressService,
    { provide: LEARNING_PATH_EVENTS, useClass: LearningPathEventHub },
  ],
  exports: [LearningPathsService, ProgressService, LEARNING_PATH_EVENTS],
})
export class LearningPathsModule {}
