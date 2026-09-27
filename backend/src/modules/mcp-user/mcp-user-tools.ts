import type { CatalogRepository } from '../catalog-scraper/ports/catalog-repository.port'
import type { AuthService } from '../identity/application/auth.service'
import { createCatalogCache } from '../mcp-public/catalog-cache'
import { createLearningPathGenerator } from '../mcp-public/learning-path-generator'
import { escapeMermaidLabel } from '../mcp-public/mermaid'
import { registerMcpTools } from '../mcp-public/tools/register-mcp-tools'
import { logMcpSwallowed, runMcpTool } from '../mcp-public/mcp-tool-log'
import { attachLive, livePathPublisher } from '../live-path/live-path.copy'
import type { LivePathEventName } from '../live-path/live-path.types'
import type { LearningPathsService } from '../learning-paths/learning-paths.service'
import type { ProgressService } from '../learning-paths/progress.service'
import { UnprocessableEntityException } from '@nestjs/common'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export type McpUserDeps = {
  paths?: LearningPathsService
  progress?: ProgressService
  auth?: Pick<AuthService, 'getMe'>
  catalog?: CatalogRepository
}

export const mcpUserDeps: McpUserDeps = {}

export function registerUserMcpServer(server: McpServer, userId: string): void {
  if (mcpUserDeps.catalog) {
    registerMcpTools(server, {
      cache: createCatalogCache({ repository: mcpUserDeps.catalog }),
      generator: createLearningPathGenerator(),
      liveUserId: userId,
    })
  }
  const annotations = { readOnlyHint: false, openWorldHint: false }
  server.registerTool(
    'get_my_profile',
    { description: 'Perfil del usuario del token.', inputSchema: {}, annotations: { ...annotations, readOnlyHint: true } },
    async () =>
      runMcpTool({ surface: 'user', tool: 'get_my_profile', userId }, async () => ok(await profile(userId))),
  )
  server.registerTool(
    'list_my_paths',
    {
      description: 'Rutas del usuario del token.',
      inputSchema: { status: z.enum(['active', 'archived', 'all']).optional() },
      annotations: { ...annotations, readOnlyHint: true },
    },
    async (args) =>
      runMcpTool({ surface: 'user', tool: 'list_my_paths', userId }, async () =>
        ok(await listPaths(userId, args.status ?? 'active')),
      ),
  )
  server.registerTool(
    'get_my_path',
    {
      description: 'Detalle de una ruta del usuario del token.',
      inputSchema: { id: z.string().uuid() },
      annotations: { ...annotations, readOnlyHint: true },
    },
    async (args) =>
      finishLive(
        userId,
        'path.saved',
        await runMcpTool({ surface: 'user', tool: 'get_my_path', userId }, async () =>
          ok(await getPath(userId, args.id)),
        ),
      ),
  )
  server.registerTool(
    'save_learning_path',
    {
      description: 'Guarda una ruta generada. Los títulos los pone el catálogo.',
      inputSchema: {
        course_ids: z.array(z.string()).min(1).max(50),
        title: z.string().max(200).optional(),
        buckets: z.array(z.enum(['required', 'recommended', 'optional', 'anytime'])).optional(),
        source_path_id: z.string().optional(),
      },
      annotations,
    },
    async (args) =>
      finishLive(
        userId,
        'path.saved',
        await runMcpTool({ surface: 'user', tool: 'save_learning_path', userId }, async () =>
          ok(await savePath(userId, args)),
        ),
      ),
  )
  server.registerTool(
    'update_course_progress',
    {
      description: 'Actualiza el progreso de un curso en una ruta del usuario del token.',
      inputSchema: {
        path_id: z.string().uuid(),
        course_id: z.string(),
        status: z.enum(['not_started', 'in_progress', 'completed']),
      },
      annotations,
    },
    async (args) =>
      finishLive(
        userId,
        'progress.updated',
        await runMcpTool({ surface: 'user', tool: 'update_course_progress', userId }, async () =>
          ok(await updateProgress(userId, args.path_id, args.course_id, args.status)),
        ),
        { path_id: args.path_id, course_id: args.course_id, status: args.status },
      ),
  )
}

async function profile(userId: string) {
  const user = await mcpUserDeps.auth?.getMe(userId)
  const listed = mcpUserDeps.paths ? await mcpUserDeps.paths.list(userId, 'active') : { items: [] }
  return {
    display_name: user?.displayName ?? '',
    avatar_url: user?.avatarUrl ?? null,
    active_path_count: listed.items.length,
    completed_course_count: listed.items.reduce((sum, path) => sum + path.completedCount, 0),
  }
}

async function listPaths(userId: string, status: 'active' | 'archived' | 'all') {
  const listed = await mcpUserDeps.paths?.list(userId, status)
  if (!listed) return fail('not_found')
  return {
    paths: listed.items.map((path) => ({
      id: path.id,
      title: path.title,
      kind: path.kind,
      status: path.status,
      item_count: path.itemCount,
      completed_count: path.completedCount,
      progress_ratio: path.progressRatio,
      updated_at: path.updatedAt,
    })),
  }
}

function requiredEdges(items: Array<{ courseId: string; bucket: string | null; position: number }>) {
  const required = items
    .filter((item) => item.bucket === 'required')
    .sort((left, right) => left.position - right.position || left.courseId.localeCompare(right.courseId))
  const edges: Array<{ from_course_id: string; to_course_id: string }> = []
  for (let index = 0; index < required.length - 1; index += 1) {
    const from = required[index]
    const to = required[index + 1]
    if (from && to) edges.push({ from_course_id: from.courseId, to_course_id: to.courseId })
  }
  return edges
}

async function getPath(userId: string, id: string) {
  try {
    const detail = await mcpUserDeps.paths?.getById(userId, id)
    if (!detail) return fail('not_found')
    const lines = ['flowchart LR']
    for (const item of detail.items) {
      const bucket = item.bucket ?? 'search'
      const state = item.progress.status === 'completed' ? 'Completed' : item.progress.status === 'in_progress' ? 'InProgress' : 'NotStarted'
      lines.push(`  c${item.courseId}["${escapeMermaidLabel(item.courseTitle)}"]:::${bucket}${state}`)
    }
    return { ...detail, edges: requiredEdges(detail.items), ui: { allow_progress: true }, diagram: { mermaid: lines.join('\n') } }
  } catch (error) {
    logMcpSwallowed({ surface: 'user', tool: 'get_my_path', userId }, error)
    return fail('not_found')
  }
}

async function savePath(
  userId: string,
  args: { course_ids: string[]; title?: string; buckets?: Array<'required' | 'recommended' | 'optional' | 'anytime'>; source_path_id?: string },
) {
  try {
    const saved = await mcpUserDeps.paths?.saveGenerated(userId, {
      title: args.title,
      courseIds: args.course_ids,
      buckets: args.buckets,
      sourcePathId: args.source_path_id,
    })
    if (!saved) return fail('not_found')
    return saved
  } catch (error) {
    if (!(error instanceof UnprocessableEntityException)) {
      logMcpSwallowed({ surface: 'user', tool: 'save_learning_path', userId }, error)
    }
    return fail('invalid_input')
  }
}

async function updateProgress(
  userId: string,
  pathId: string,
  courseId: string,
  status: 'not_started' | 'in_progress' | 'completed',
) {
  const detail = await mcpUserDeps.paths?.getById(userId, pathId).catch(() => null)
  if (!detail || !detail.items.some((item) => item.courseId === courseId)) return fail('not_found')
  const row = await mcpUserDeps.progress?.upsert(userId, courseId, status)
  return { course_id: courseId, status: row?.status ?? status }
}

async function finishLive(
  userId: string,
  event: LivePathEventName,
  result: {
    isError?: boolean
    content?: Array<{ type: 'text'; text: string }>
    structuredContent?: Record<string, unknown>
  },
  data?: Record<string, unknown>,
) {
  if (!result.isError) {
    await livePathPublisher.publish(userId, {
      event,
      data: { type: event, ...(data ?? result.structuredContent ?? {}) },
    })
  }
  return attachLive(result)
}

function ok(payload: unknown) {
  if (payload && typeof payload === 'object' && 'isError' in payload) {
    return payload as {
      isError: true
      content: { type: 'text'; text: string }[]
    }
  }
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
    structuredContent: (payload ?? {}) as Record<string, unknown>,
  }
}

function fail(message: string) {
  return { isError: true as const, content: [{ type: 'text' as const, text: message }] }
}
