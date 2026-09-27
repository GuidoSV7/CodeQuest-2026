import type { LivePathDraft } from './live-path.types'

export const LIVE_PAGE_URL =
  'https://codequest-frontend-oiueyi-4bb3e7-31-97-78-167.sslip.io/en-vivo'

export const livePathPublisher: {
  publish: (userId: string, draft: LivePathDraft) => Promise<void>
} = {
  async publish() {},
}

export function liveNotice(choice = false): string {
  if (choice) {
    return `Decile a Claude cuál preferís. Las opciones están en tu página: ${LIVE_PAGE_URL}`
  }
  return `La ruta se muestra en tu página: ${LIVE_PAGE_URL}`
}

type TextBlock = { type: 'text'; text: string }

export type LiveToolResult = {
  isError?: boolean
  content: TextBlock[]
  structuredContent?: Record<string, unknown>
}

export function attachLive(result: {
  isError?: boolean
  content?: TextBlock[]
  structuredContent?: Record<string, unknown>
}, choice = false): LiveToolResult {
  const content = result.content ?? []
  if (result.isError) return { ...result, content }
  return {
    ...result,
    content: [...content, { type: 'text', text: liveNotice(choice) }],
    structuredContent: { ...(result.structuredContent ?? {}), live_url: LIVE_PAGE_URL },
  }
}
