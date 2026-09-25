import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const PATH_DIAGRAM_URI = 'ui://codequest/path-diagram.html'
export const PATH_DIAGRAM_MIME = 'text/html;profile=mcp-app'

export const pathDiagramMeta = {
  ui: { resourceUri: PATH_DIAGRAM_URI },
  'ui/resourceUri': PATH_DIAGRAM_URI,
}

const registered = new WeakSet<object>()

let cachedHtml: string | undefined

export function pathDiagramHtml(): string {
  if (cachedHtml === undefined) {
    cachedHtml = readFileSync(path.join(__dirname, 'assets', 'path-diagram.html'), 'utf8')
  }
  return cachedHtml
}

export function registerPathDiagram(server: McpServer): void {
  if (registered.has(server)) return
  registered.add(server)
  const html = pathDiagramHtml()
  server.registerResource(
    'path-diagram',
    PATH_DIAGRAM_URI,
    { description: 'Diagrama interactivo de una ruta CodeQuest', mimeType: PATH_DIAGRAM_MIME } as {
      description: string
      mimeType: string
    },
    async () => ({
      contents: [{ uri: PATH_DIAGRAM_URI, mimeType: PATH_DIAGRAM_MIME, text: html }],
    }),
  )
}
