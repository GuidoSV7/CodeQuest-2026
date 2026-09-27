import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'
import { buildTypeOrmOptions } from './config/database.config'
import { validateEnv, type Env } from './config/env.validation'
import { HealthModule } from './modules/health/health.module'
import { CatalogScraperModule } from './modules/catalog-scraper/nest/catalog-scraper.module'
import { IdentityModule } from './modules/identity/identity.module'
import { LearningPathsModule } from './modules/learning-paths/learning-paths.module'
import { McpUserBridge } from './modules/mcp-user/mcp-user.bridge'
import { McpPublicModule } from './modules/mcp-public/mcp-public.module'
import { McpUserModule } from './modules/mcp-user/mcp-user.module'
import { LivePathModule } from './modules/live-path/live-path.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService<Env, true>) => ({
        ...buildTypeOrmOptions({
          DB_HOST: c.get('DB_HOST', { infer: true }),
          DB_PORT: c.get('DB_PORT', { infer: true }),
          DB_USERNAME: c.get('DB_USERNAME', { infer: true }),
          DB_PASSWORD: c.get('DB_PASSWORD', { infer: true }),
          DB_NAME: c.get('DB_NAME', { infer: true }),
          DB_SYNCHRONIZE: c.get('DB_SYNCHRONIZE', { infer: true }),
          DB_LOGGING: c.get('DB_LOGGING', { infer: true }),
        }),
        autoLoadEntities: true,
      }),
    }),
    HealthModule,
    CatalogScraperModule,
    IdentityModule,
    LivePathModule,
    LearningPathsModule,
    McpPublicModule,
    McpUserModule,
  ],
  providers: [McpUserBridge],
})
export class AppModule {}
