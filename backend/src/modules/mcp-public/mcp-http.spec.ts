import 'reflect-metadata'
import { json } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { RequestMethod, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import type { CatalogRepository } from '../catalog-scraper/ports/catalog-repository.port'
import { CATALOG_REPOSITORY } from '../catalog-scraper/ports/catalog-repository.port'
import { McpPublicModule } from './mcp-public.module'
import { mountMcpHttpGuards, resetMcpRateLimit } from './mcp-http-guards'
import { MAX_MCP_BODY_BYTES } from './mcp-limits'

function course(
  id: number,
  slug: string,
  title: string,
  extra: Partial<CatalogSnapshot['courses'][number]> = {},
): CatalogSnapshot['courses'][number] {
  return {
    subtitleLabel: null,
    metaDescription: null,
    description: null,
    coverImageUrl: null,
    previewYoutubeId: null,
    price: { amount: 10, currency: 'USD' },
    lessonCount: 4,
    videoHours: 2,
    instructor: 'Fernando Herrera',
    hasSubtitles: false,
    prerequisites: [],
    sections: [],
    relatedCourses: [],
    learningPathUrl: null,
    categories: ['all'],
    scrapedAt: '2026-09-21T00:00:00.000Z',
    relatedCourseIds: [],
    status: 'ok',
    sourceUrl: `https://cursos.devtalles.com/courses/${slug}`,
    ...extra,
    id,
    slug,
    title,
  }
}

function catalog(): CatalogSnapshot {
  const reactRequired = {
    bucket: 'REQUIRED' as const,
    courseSlug: 'react-de-cero',
    courseUrl: 'https://cursos.devtalles.com/courses/react-de-cero',
    label: 'React: de cero a experto',
    tags: ['frontend'],
    position: 1,
    courseId: 3395229,
  }
  const reactRec = {
    bucket: 'RECOMMENDED' as const,
    courseSlug: 'js-moderno',
    courseUrl: 'https://cursos.devtalles.com/courses/js-moderno',
    label: 'JavaScript Moderno: Guía para dominar el lenguaje',
    tags: ['frontend'],
    position: 0,
    courseId: 111,
  }
  const courses = [
    course(3395229, 'react-de-cero', 'React: de cero a experto'),
    course(111, 'js-moderno', 'JavaScript Moderno: Guía para dominar el lenguaje'),
    course(1000, 'go-apis', 'Go APIs', { metaDescription: 'servidores http' }),
  ]
  return {
    version: 7,
    generatedAt: '2026-09-21T00:00:00.000Z',
    source: 'scraper',
    courses,
    paths: [
      {
        id: 'programas-react',
        title: 'Ruta de aprendizaje React',
        pagePath: '/pages/programas-react',
        scrapedAt: '2026-09-21T00:00:00.000Z',
        entries: [reactRec, reactRequired],
        buckets: {
          REQUIRED: [reactRequired],
          RECOMMENDED: [reactRec],
          OPTIONAL: [],
          ANYTIME: [],
        },
      },
    ],
    stats: {
      courseCount: courses.length,
      pathCount: 1,
      categoryCounts: {
        all: courses.length,
        wip: 0,
        free: 0,
        mini: 0,
        exclusive: 0,
        legacy: 0,
      },
    },
  }
}

const TOOL_NAMES = [
  'search_courses',
  'get_course',
  'list_official_paths',
  'get_official_path',
  'generate_learning_path',
]

async function toolText(client: Client, name: string, args: Record<string, unknown>) {
  const result = (await client.callTool({ name, arguments: args })) as {
    content?: Array<{ type: string; text?: string }>
  }
  const block = result.content?.find((item) => item.type === 'text')
  return block?.text ?? ''
}

async function expectReadableToolError(pending: Promise<unknown>) {
  try {
    const result = (await pending) as {
      isError?: boolean
      content?: Array<{ type: string; text?: string }>
    }
    expect(result.isError).toBe(true)
    const text = result.content?.map((item) => item.text ?? '').join('\n') ?? ''
    expect(text).toMatch(/invalid|validation|required|too small|limit|goal|query|id/i)
    expect(text).not.toMatch(/\n\s+at /)
    expect(text.toLowerCase()).not.toContain('node_modules')
  } catch (error) {
    const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
    expect(message).toMatch(/invalid|validation|required|too small|limit|goal|query|id/i)
    expect(message).not.toMatch(/\n\s+at /)
    expect(message.toLowerCase()).not.toContain('node_modules')
  }
}

describe('public MCP endpoint', () => {
  let app: INestApplication
  let baseUrl: string
  let client: Client

  beforeAll(async () => {
    const repo: CatalogRepository = {
      async getCurrent() {
        return catalog()
      },
      async save(snapshot) {
        return snapshot
      },
    }
    const moduleRef = await Test.createTestingModule({
      imports: [McpPublicModule],
    })
      .overrideProvider(CATALOG_REPOSITORY)
      .useValue(repo)
      .compile()

    app = moduleRef.createNestApplication({ bodyParser: false })
    mountMcpHttpGuards(app.getHttpAdapter().getInstance())
    app.use(json({ limit: MAX_MCP_BODY_BYTES }))
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'mcp', method: RequestMethod.ALL }],
    })
    await app.listen(0)
    const address = app.getHttpServer().address()
    const port = typeof address === 'object' && address ? address.port : 0
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    const server = app?.getHttpServer() as { closeAllConnections?: () => void } | undefined
    server?.closeAllConnections?.()
    await app?.close()
  })

  async function connectClient() {
    resetMcpRateLimit()
    client = new Client({ name: 'codequest-test', version: '0.0.0' })
    await client.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)))
  }

  it('lists five read-only tools after initialize', async () => {
    await connectClient()
    const listed = await client.listTools()
    expect(listed.tools.map((tool) => tool.name).sort()).toEqual([...TOOL_NAMES].sort())
    for (const tool of listed.tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true)
      expect(tool.annotations?.openWorldHint).toBe(false)
      expect(tool.inputSchema).toBeTruthy()
      expect(tool.description?.length).toBeGreaterThan(20)
    }
    const official = listed.tools.find((tool) => tool.name === 'get_official_path')
    const generated = listed.tools.find((tool) => tool.name === 'generate_learning_path')
    expect(official?._meta).toMatchObject({
      ui: { resourceUri: 'ui://codequest/path-diagram.html' },
    })
    expect(generated?._meta).toMatchObject({
      ui: { resourceUri: 'ui://codequest/path-diagram.html' },
    })
    const resources = await client.listResources()
    expect(resources.resources.map((resource) => resource.uri)).toContain(
      'ui://codequest/path-diagram.html',
    )
    const read = await client.readResource({ uri: 'ui://codequest/path-diagram.html' })
    expect(read.contents[0]).toMatchObject({
      mimeType: 'text/html;profile=mcp-app',
    })
  })

  it('calls every tool with valid input and rejects invalid input without a stack', async () => {
    await connectClient()
    const search = JSON.parse(await toolText(client, 'search_courses', { query: 'servidores http' }))
    expect(search.courses[0]?.id).toBe('1000')

    const detail = JSON.parse(await toolText(client, 'get_course', { id: '111' }))
    expect(detail.course.slug).toBe('js-moderno')

    const paths = JSON.parse(await toolText(client, 'list_official_paths', {}))
    expect(paths.paths.map((item: { id: string }) => item.id)).toContain('programas-react')

    const official = JSON.parse(await toolText(client, 'get_official_path', { id: 'programas-react' }))
    expect(official.path.courses.map((item: { course_id: string }) => item.course_id)).toEqual([
      '111',
      '3395229',
    ])

    const generated = JSON.parse(
      await toolText(client, 'generate_learning_path', { goal: 'React' }),
    )
    expect(generated.strategy).toBe('official_path')
    for (const goal of ['frontend', 'backend', 'móvil']) {
      const other = JSON.parse(await toolText(client, 'generate_learning_path', { goal }))
      expect(other.diagram.mermaid).toContain('flowchart')
      expect(other.strategy === 'official_path' || other.strategy === 'catalog_search').toBe(true)
    }
    expect(generated.source_path_id).toBe('programas-react')
    expect(generated.diagram.mermaid).toContain('flowchart')
    expect(official.path.diagram.mermaid).toContain('flowchart')

    const schemaErrors = [
      client.callTool({ name: 'generate_learning_path', arguments: { goal: '' } }),
      client.callTool({ name: 'search_courses', arguments: { query: 'x', limit: 99 } }),
      client.callTool({ name: 'get_course', arguments: {} }),
    ]
    for (const pending of schemaErrors) {
      await expectReadableToolError(pending)
    }

    const missing = (await client.callTool({
      name: 'get_official_path',
      arguments: { id: 'no-existe' },
    })) as { isError?: boolean; content?: Array<{ type: string; text?: string }> }
    expect(missing.isError).toBe(true)
    const missingText = missing.content?.find((item) => item.type === 'text')?.text ?? ''
    expect(missingText).toContain('not_found')
    expect(missingText).not.toMatch(/\n\s+at /)
  })

  it('answers a second tools/call without an MCP session id', async () => {
    await connectClient()
    const first = await toolText(client, 'list_official_paths', {})
    const second = await toolText(client, 'list_official_paths', {})
    expect(second).toBe(first)
  })

  it('rate limits the 31st request from the same IP', async () => {
    if (client) {
      await Promise.race([client.close(), new Promise((resolve) => setTimeout(resolve, 300))])
    }
    resetMcpRateLimit()
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })
    for (let i = 0; i < 30; i += 1) {
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
        body,
      })
      expect(response.status).not.toBe(429)
    }
    const limited = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body,
    })
    expect(limited.status).toBe(429)
    const payload = (await limited.json()) as { error: { message: string } }
    expect(payload.error.message).toBe('rate_limited')
  })

  it('rejects bodies larger than 256 KiB', async () => {
    const huge = 'x'.repeat(MAX_MCP_BODY_BYTES)
    const response = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping', padding: huge }),
    })
    expect(response.status).toBe(413)
    const payload = (await response.json()) as { error: { message: string } }
    expect(payload.error.message).toBe('payload_too_large')
    const text = JSON.stringify(payload)
    expect(text).not.toMatch(/\n\s+at /)
  })
})
