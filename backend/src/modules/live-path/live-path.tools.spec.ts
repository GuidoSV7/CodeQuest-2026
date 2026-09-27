import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import { liveNotice, livePathPublisher, LIVE_PAGE_URL } from './live-path.copy'
import type { LivePathDraft } from './live-path.types'
import { mcpUserDeps, registerUserMcpServer } from '../mcp-user/mcp-user-tools'
import { createLearningPathGenerator } from '../mcp-public/learning-path-generator'
import { registerMcpTools } from '../mcp-public/tools/register-mcp-tools'
import { createCatalogCache } from '../mcp-public/catalog-cache'

const snapshot = {
  version: 1,
  generatedAt: '2026-09-21T00:00:00.000Z',
  source: 'scraper',
  courses: [
    {
      id: 1,
      slug: 'react-de-cero',
      title: 'React: de cero a experto',
      subtitleLabel: null,
      metaDescription: 'react',
      description: null,
      coverImageUrl: null,
      previewYoutubeId: null,
      price: { amount: 10, currency: 'USD' },
      lessonCount: 4,
      videoHours: 2,
      instructor: null,
      hasSubtitles: false,
      prerequisites: [],
      sections: [],
      relatedCourses: [],
      learningPathUrl: null,
      sourceUrl: 'https://cursos.devtalles.com/courses/react-de-cero',
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

describe('live path tool events', () => {
  const published: LivePathDraft[] = []

  afterEach(() => {
    published.length = 0
    livePathPublisher.publish = async () => {}
    mcpUserDeps.catalog = undefined
  })

  it('publishes path.generated and the live sentence only for the user server', async () => {
    livePathPublisher.publish = async (_userId, draft) => {
      published.push(draft)
    }
    mcpUserDeps.catalog = {
      async getCurrent() {
        return snapshot
      },
      async save(value) {
        return value
      },
    }
    const user = await call('user')
    expect(published.map((item) => item.event)).toEqual(['path.generated'])
    expect(user.texts.join('\n')).toContain(liveNotice())
    expect(user.structured.live_url).toBe(LIVE_PAGE_URL)

    published.length = 0
    await call('public')
    expect(published).toEqual([])
  })

  it('does not publish when the user tool fails', async () => {
    const publish = vi.fn(async () => {})
    livePathPublisher.publish = publish
    const server = new McpServer({ name: 'codequest', version: '1' })
    registerUserMcpServer(server, 'ada')
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'live', version: '0' })
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
    const result = await client.callTool({
      name: 'get_my_path',
      arguments: { id: '11111111-1111-4111-8111-111111111111' },
    })
    expect(result.isError).toBe(true)
    expect(publish).not.toHaveBeenCalled()
    await client.close()
    await server.close()
  })
})

async function call(kind: 'user' | 'public') {
  const server = new McpServer({ name: 'codequest', version: '1' })
  if (kind === 'user') {
    registerUserMcpServer(server, 'ada')
  } else {
    registerMcpTools(server, {
      cache: createCatalogCache({
        repository: {
          async getCurrent() {
            return snapshot
          },
          async save(value) {
            return value
          },
        },
      }),
      generator: createLearningPathGenerator(),
    })
  }
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'live', version: '0' })
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  const result = await client.callTool({ name: 'generate_learning_path', arguments: { goal: 'React' } })
  const texts = (result.content ?? [])
    .filter((item) => item.type === 'text' && 'text' in item)
    .map((item) => String(item.text))
  await client.close()
  await server.close()
  return {
    isError: result.isError === true,
    texts,
    structured: (result.structuredContent ?? {}) as { live_url?: string },
  }
}
