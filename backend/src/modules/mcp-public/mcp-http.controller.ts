import { All, Controller, Inject, Logger, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { CatalogRepository } from '../catalog-scraper/ports/catalog-repository.port'
import { CATALOG_REPOSITORY } from '../catalog-scraper/ports/catalog-repository.port'
import { createCatalogCache } from './catalog-cache'
import { createLearningPathGenerator } from './learning-path-generator'
import { registerMcpTools } from './tools/register-mcp-tools'

@Controller()
export class McpHttpController {
  private readonly logger = new Logger(McpHttpController.name)
  private readonly cache
  private readonly generator = createLearningPathGenerator()

  constructor(@Inject(CATALOG_REPOSITORY) repository: CatalogRepository) {
    this.cache = createCatalogCache({ repository })
  }

  @All('mcp')
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const server = new McpServer({ name: 'codequest-catalog', version: '1.0.0' })
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    registerMcpTools(server, { cache: this.cache, generator: this.generator })
    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'mcp_request_failed')
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32603, message: 'catalog_unavailable' },
        })
      }
    } finally {
      res.on('close', () => {
        void server.close().catch(() => undefined)
      })
    }
  }
}
