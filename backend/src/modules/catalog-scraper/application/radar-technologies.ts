import type { CatalogSnapshot } from '../domain/catalog'

const RADAR_LIMIT = 8

/** Official path titles from the current scraped catalog, in snapshot order. */
export function radarTechnologies(snapshot: CatalogSnapshot): string[] {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const path of snapshot.paths) {
    const title = path.title.trim()
    if (!title || seen.has(title)) continue
    seen.add(title)
    labels.push(title)
    if (labels.length === RADAR_LIMIT) break
  }
  return labels
}
