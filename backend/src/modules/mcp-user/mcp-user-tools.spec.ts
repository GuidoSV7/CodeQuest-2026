import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { McpUserModule } from './mcp-user.module'
import { MCP_TOKEN_VERIFIER, type McpTokenVerifier } from './mcp-token-verifier'
import { MCP_RESOURCE_URL } from './mcp-oauth.metadata'
import { mcpUserDeps } from './mcp-user-tools'
import { LearningPathsService } from '../learning-paths/learning-paths.service'
import {
  createInMemoryItemRepo,
  createInMemoryPathRepo,
  createInMemoryProgressRepo,
  type PathStore,
} from '../learning-paths/test/in-memory-repos'
import { ProgressService } from '../learning-paths/progress.service'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'

function verifier(): McpTokenVerifier {
  const expiresAt = Math.floor(Date.now() / 1000) + 600
  const rows: Record<string, { userId: string; scopes: string[] }> = {
    'token-a': { userId: USER_A, scopes: ['profile:read', 'paths:read', 'paths:write', 'progress:read', 'progress:write'] },
    'token-b': { userId: USER_B, scopes: ['profile:read', 'paths:read', 'paths:write', 'progress:read', 'progress:write'] },
  }
  return {
    async verifyAccessToken(token: string) {
      const row = rows[token]
      if (!row) throw new Error('unknown_token')
      return { ...row, resource: MCP_RESOURCE_URL, expiresAt }
    },
  }
}

describe('MCP user tools', () => {
  let app: INestApplication
  let baseUrl: string
  let service: LearningPathsService

  beforeAll(async () => {
    const store: PathStore = new Map()
    const paths = createInMemoryPathRepo(store)
    const items = createInMemoryItemRepo(store)
    const progress = createInMemoryProgressRepo()
    const snapshot = {
      version: 7,
      generatedAt: '2026-09-21T00:00:00.000Z',
      source: 'scraper',
      courses: [
        {
          id: 100,
          slug: 'course-a',
          title: 'Course A',
          subtitleLabel: null,
          metaDescription: null,
          description: null,
          coverImageUrl: null,
          previewYoutubeId: null,
          price: { amount: 10, currency: 'USD' },
          lessonCount: 1,
          videoHours: 1,
          instructor: null,
          hasSubtitles: false,
          prerequisites: [],
          sections: [],
          relatedCourses: [],
          learningPathUrl: null,
          sourceUrl: 'https://cursos.devtalles.com/courses/course-a',
          categories: ['all'],
          scrapedAt: '2026-09-21T00:00:00.000Z',
          relatedCourseIds: [],
          status: 'ok',
        },
      ],
      paths: [],
      stats: {
        courseCount: 1,
        pathCount: 0,
        categoryCounts: { all: 1, wip: 0, free: 0, mini: 0, exclusive: 0, legacy: 0 },
      },
    } as CatalogSnapshot
    service = new LearningPathsService(paths, items, progress, {
      getCurrent: async () => snapshot,
      save: async (catalog) => catalog,
    })
    mcpUserDeps.paths = service
    mcpUserDeps.progress = new ProgressService(progress)
    mcpUserDeps.auth = {
      async getMe(id: string) {
        return id === USER_A
          ? { id, displayName: 'Ada', avatarUrl: null, email: null, createdAt: new Date(), updatedAt: new Date() }
          : { id, displayName: 'Bea', avatarUrl: null, email: null, createdAt: new Date(), updatedAt: new Date() }
      },
    }
    mcpUserDeps.catalog = { getCurrent: async () => snapshot, save: async (catalog) => catalog }
    const moduleRef = await Test.createTestingModule({ imports: [McpUserModule] })
      .overrideProvider(MCP_TOKEN_VERIFIER)
      .useValue(verifier())
      .compile()
    app = moduleRef.createNestApplication()
    await app.listen(0)
    const address = app.getHttpServer().address()
    const port = typeof address === 'object' && address ? address.port : 0
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    mcpUserDeps.paths = undefined
    mcpUserDeps.progress = undefined
    mcpUserDeps.auth = undefined
    mcpUserDeps.catalog = undefined
    const server = app?.getHttpServer() as { closeAllConnections?: () => void } | undefined
    server?.closeAllConnections?.()
    await app?.close()
  })

  async function clientFor(token: string) {
    const client = new Client({ name: 'user-tools', version: '0.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp/user`), {
      requestInit: { headers: { authorization: `Bearer ${token}` } },
    })
    await client.connect(transport)
    return client
  }

  it('saves catalog titles for the token user and hides the path from another user', async () => {
    const ada = await clientFor('token-a')
    const saved = await ada.callTool({
      name: 'save_learning_path',
      arguments: { course_ids: ['100'], title: 'Desde el token', course_titles: ['Inventado'] },
    })
    const text = saved.content?.find((item) => item.type === 'text' && 'text' in item)?.text ?? ''
    const parsed = JSON.parse(text) as { items?: Array<{ courseTitle: string }>; id?: string }
    expect(parsed.items?.[0]?.courseTitle).toBe('Course A')
    const missing = await ada.callTool({
      name: 'save_learning_path',
      arguments: { course_ids: ['404'], user_id: USER_B },
    })
    expect(missing.isError).toBe(true)

    const bea = await clientFor('token-b')
    const foreign = await bea.callTool({
      name: 'get_my_path',
      arguments: { id: parsed.id },
    })
    expect(foreign.isError).toBe(true)
    const own = await ada.callTool({ name: 'list_my_paths', arguments: {} })
    const listed = JSON.parse(own.content?.find((item) => item.type === 'text' && 'text' in item)?.text ?? '{}') as {
      paths: Array<{ id: string }>
    }
    expect(listed.paths.map((path) => path.id)).toContain(parsed.id)
    const publicTool = await ada.callTool({ name: 'search_courses', arguments: { query: 'Course' } })
    const search = JSON.parse(publicTool.content?.find((item) => item.type === 'text' && 'text' in item)?.text ?? '{}') as {
      courses: Array<{ id: string }>
    }
    expect(search.courses[0]?.id).toBe('100')
  })

  it('reads profile, paths and progress for the token user', async () => {
    const ada = await clientFor('token-a')
    const saved = await ada.callTool({
      name: 'save_learning_path',
      arguments: { course_ids: ['100'], title: 'Ruta de Ada' },
    })
    const created = JSON.parse(textOf(saved)) as { id: string; title: string; items: Array<{ courseId: string }> }
    expect(created.title).toBe('Ruta de Ada')
    expect(created.items[0]?.courseId).toBe('100')

    const profile = JSON.parse(textOf(await ada.callTool({ name: 'get_my_profile', arguments: {} }))) as {
      display_name: string
      active_path_count: number
    }
    expect(profile.display_name).toBe('Ada')
    expect(profile.active_path_count).toBeGreaterThanOrEqual(1)

    const listed = JSON.parse(textOf(await ada.callTool({ name: 'list_my_paths', arguments: {} }))) as {
      paths: Array<{ id: string; title: string; completed_count: number }>
    }
    expect(listed.paths.find((path) => path.id === created.id)?.title).toBe('Ruta de Ada')

    const detail = JSON.parse(textOf(await ada.callTool({ name: 'get_my_path', arguments: { id: created.id } }))) as {
      id: string
      items: Array<{ courseId: string; courseTitle: string; progress: { status: string } }>
      diagram: { mermaid: string }
    }
    expect(detail.items[0]?.courseTitle).toBe('Course A')
    expect(detail.items[0]?.progress.status).toBe('not_started')
    expect(detail.diagram.mermaid).toContain('Course A')

    const updated = JSON.parse(textOf(await ada.callTool({
      name: 'update_course_progress',
      arguments: { path_id: created.id, course_id: '100', status: 'completed' },
    }))) as { course_id: string; status: string }
    expect(updated).toEqual({ course_id: '100', status: 'completed' })

    const after = JSON.parse(textOf(await ada.callTool({ name: 'get_my_path', arguments: { id: created.id } }))) as {
      completedCount: number
      items: Array<{ progress: { status: string } }>
    }
    expect(after.items[0]?.progress.status).toBe('completed')
    expect(after.completedCount).toBe(1)

    const bea = await clientFor('token-b')
    const foreignList = JSON.parse(textOf(await bea.callTool({ name: 'list_my_paths', arguments: {} }))) as {
      paths: Array<{ id: string }>
    }
    expect(foreignList.paths.map((path) => path.id)).not.toContain(created.id)
  })
})

function textOf(result: { content?: Array<{ type: string; text?: string }> }): string {
  return result.content?.find((item) => item.type === 'text')?.text ?? ''
}
