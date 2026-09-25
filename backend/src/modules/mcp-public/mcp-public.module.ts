import { Module } from '@nestjs/common'
import { CatalogScraperModule } from '../catalog-scraper/nest/catalog-scraper.module'
import { McpHttpController } from './mcp-http.controller'

@Module({
  imports: [CatalogScraperModule],
  controllers: [McpHttpController],
})
export class McpPublicModule {}
