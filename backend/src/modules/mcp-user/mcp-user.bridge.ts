import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { CATALOG_REPOSITORY, type CatalogRepository } from '../catalog-scraper/ports/catalog-repository.port'
import { AUTH_SERVICE } from '../identity/identity.tokens'
import type { AuthService } from '../identity/application/auth.service'
import { LearningPathsService } from '../learning-paths/learning-paths.service'
import { ProgressService } from '../learning-paths/progress.service'
import { mcpUserDeps } from './mcp-user-tools'

@Injectable()
export class McpUserBridge implements OnModuleInit {
  constructor(
    private readonly paths: LearningPathsService,
    private readonly progress: ProgressService,
    @Inject(AUTH_SERVICE) private readonly auth: AuthService,
    @Inject(CATALOG_REPOSITORY) private readonly catalog: CatalogRepository,
  ) {}

  onModuleInit(): void {
    mcpUserDeps.paths = this.paths
    mcpUserDeps.progress = this.progress
    mcpUserDeps.auth = this.auth
    mcpUserDeps.catalog = this.catalog
  }
}
