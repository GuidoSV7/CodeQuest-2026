export const LIVE_PATH_EVENTS = ['path.generated', 'path.choice_required', 'path.saved', 'progress.updated'] as const

export type LivePathEventName = (typeof LIVE_PATH_EVENTS)[number]

export type LivePathEvent = {
  id: number
  event: LivePathEventName
  data: Record<string, unknown>
}

export type LivePathDraft = Omit<LivePathEvent, 'id'>
