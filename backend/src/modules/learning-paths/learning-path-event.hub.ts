export const LEARNING_PATH_EVENTS = 'LEARNING_PATH_EVENTS'

export type PathEventClient = {
  send: (data: string) => void
}

export class LearningPathEventHub {
  private readonly clients = new Map<string, Set<PathEventClient>>()

  subscribe(userId: string, client: PathEventClient): () => void {
    const group = this.clients.get(userId) ?? new Set<PathEventClient>()
    group.add(client)
    this.clients.set(userId, group)
    return () => {
      group.delete(client)
      if (group.size === 0) this.clients.delete(userId)
    }
  }

  publishPathCreated(userId: string, path: { id: string; title: string }): void {
    const payload = JSON.stringify({
      type: 'path_created',
      id: path.id,
      title: path.title,
    })
    for (const client of this.clients.get(userId) ?? []) {
      client.send(payload)
    }
  }
}
