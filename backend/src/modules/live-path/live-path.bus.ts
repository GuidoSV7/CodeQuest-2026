import type { LivePathDraft, LivePathEvent } from './live-path.types'

type Listener = (event: LivePathEvent) => void

/** In-process bus. One backend replica; events do not cross processes. */
export class InProcessLivePathBus {
  private sequence = 0
  private readonly listeners = new Map<string, Set<Listener>>()

  publish(userId: string, draft: LivePathDraft): LivePathEvent {
    const event: LivePathEvent = { id: ++this.sequence, ...draft }
    for (const listener of this.listeners.get(userId) ?? []) listener(event)
    return event
  }

  subscribe(userId: string, listener: Listener): () => void {
    const group = this.listeners.get(userId) ?? new Set<Listener>()
    group.add(listener)
    this.listeners.set(userId, group)
    return () => {
      group.delete(listener)
      if (group.size === 0) this.listeners.delete(userId)
    }
  }

  subscriberCount(userId: string): number {
    return this.listeners.get(userId)?.size ?? 0
  }
}
