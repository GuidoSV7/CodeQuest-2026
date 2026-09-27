import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CatalogCache } from '../catalog-cache'
import {
  generatePath,
  getCourse,
  getOfficialPath,
  listOfficialPaths,
  searchCourses,
} from '../catalog-read'
import type { LearningPathGenerator } from '../learning-path-generator'
import { runMcpTool } from '../mcp-tool-log'
import { tiedOfficialPaths } from '../resolve-alias'
import { attachLive, livePathPublisher } from '../../live-path/live-path.copy'

const annotations = { readOnlyHint: true as const, openWorldHint: false as const }

const idSchema = z.union([z.string().trim().min(1).max(32), z.number().int()])

function ok(payload: object) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
    structuredContent: payload as Record<string, unknown>,
  }
}

function courseId(value: string | number): string {
  return typeof value === 'number' ? String(value) : value
}

export function registerMcpTools(
  server: McpServer,
  deps: { cache: CatalogCache; generator: LearningPathGenerator; liveUserId?: string },
): void {
  server.registerTool(
    'search_courses',
    {
      description:
        'Busca cursos que existen ahora en el catálogo DevTalles. Usala cuando el usuario nombre un tema, quiera filtrar por gratis/pago o por una ruta oficial, o necesite candidatos. No genera una ruta ordenada; para eso usá generate_learning_path. Nunca inventa cursos.',
      inputSchema: {
        query: z.string().trim().min(1).max(200),
        official_path_id: z.string().trim().min(1).max(80).optional(),
        price: z.enum(['free', 'paid', 'any']).optional(),
        limit: z.number().int().min(1).max(25).optional(),
      },
      annotations,
    },
    async (args) =>
      runMcpTool({ surface: 'public', tool: 'search_courses' }, async () => {
        const { snapshot } = await deps.cache.load()
        return ok(
          searchCourses(snapshot, {
            query: args.query,
            officialPathId: args.official_path_id,
            price: args.price,
            limit: args.limit,
          }),
        )
      }),
  )

  server.registerTool(
    'get_course',
    {
      description:
        'Detalle de un curso que ya está en el catálogo, por id. Usala después de una búsqueda o de una ruta, cuando haga falta el temario, los requisitos o el video. Si el id no está en el catálogo actual, error not_found.',
      inputSchema: { id: idSchema },
      annotations,
    },
    async (args) =>
      runMcpTool({ surface: 'public', tool: 'get_course' }, async () => {
        const { snapshot } = await deps.cache.load()
        return ok(getCourse(snapshot, courseId(args.id)))
      }),
  )

  server.registerTool(
    'list_official_paths',
    {
      description:
        'Lista las rutas oficiales de DevTalles que hay en el catálogo actual (React, Nest, Dart, etc.). Usala para mostrar el menú de rutas antes de armar una. No arma la ruta del usuario.',
      inputSchema: {},
      annotations,
    },
    async () =>
      runMcpTool({ surface: 'public', tool: 'list_official_paths' }, async () => {
        const { snapshot } = await deps.cache.load()
        return ok(listOfficialPaths(snapshot))
      }),
  )

  server.registerTool(
    'get_official_path',
    {
      description:
        'Devuelve una ruta oficial completa: cursos en el orden del sitio, bucket y un diagrama Mermaid. Usala cuando ya se conoce el id de la ruta. Las flechas del diagrama son el orden lineal de los cursos obligatorios, no un grafo scrapeado.',
      inputSchema: { id: z.string().trim().min(1).max(80) },
      annotations,
    },
    async (args) =>
      runMcpTool({ surface: 'public', tool: 'get_official_path' }, async () => {
        const { snapshot } = await deps.cache.load()
        return ok(getOfficialPath(snapshot, args.id))
      }),
  )

  server.registerTool(
    'generate_learning_path',
    {
      description:
        'Arma una ruta de estudio para una meta o tecnología usando solo cursos del catálogo actual. Usala cuando el usuario diga qué quiere aprender. No uses search_courses para inventar el orden: esta tool ya elige la ruta oficial o, si no hay, un ranking textual determinista.',
      inputSchema: {
        goal: z.string().trim().min(1).max(200),
        known_course_ids: z.array(idSchema).max(50).optional(),
        include_optional: z.boolean().optional(),
      },
      annotations,
    },
    async (args) => {
      const surface = deps.liveUserId ? 'user' : 'public'
      return runMcpTool({ surface, tool: 'generate_learning_path', userId: deps.liveUserId }, async () => {
        const loaded = await deps.cache.load()
        const ids = new Set(loaded.snapshot.paths.map((path) => path.id))
        const titles = new Map(loaded.snapshot.paths.map((path) => [path.id, path.title]))
        const options = tiedOfficialPaths(args.goal, ids, titles)
        if (deps.liveUserId && options.length > 1) {
          const data = { type: 'path.choice_required', goal: args.goal, options }
          await livePathPublisher.publish(deps.liveUserId, { event: 'path.choice_required', data })
          return attachLive(ok(data), true)
        }
        const payload = generatePath(loaded.snapshot, deps.generator, {
          goal: args.goal,
          knownCourseIds: (args.known_course_ids ?? []).map(courseId),
          includeOptional: args.include_optional ?? false,
          fromSeed: loaded.fromSeed,
        })
        if (deps.liveUserId) {
          await livePathPublisher.publish(deps.liveUserId, {
            event: 'path.generated',
            data: { type: 'path.generated', ...payload },
          })
          return attachLive(ok(payload))
        }
        return ok(payload)
      })
    },
  )
}
