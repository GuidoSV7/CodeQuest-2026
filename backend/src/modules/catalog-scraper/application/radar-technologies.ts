import type { CatalogSnapshot } from '../domain/catalog'

const RADAR_LIMIT = 8

function technologyName(title: string): string {
  const name = title
    .replace(/^ruta de aprendizaje\s+/i, '')
    .replace(/^programa de\s+/i, '')
    .replace(/^ruta\s+/i, '')
    .trim()
  return name || title.trim()
}

/** Short technology names from the scraped official paths, in snapshot order. */
export function radarTechnologies(snapshot: CatalogSnapshot): string[] {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const path of snapshot.paths) {
    const title = technologyName(path.title)
    if (!title || seen.has(title)) continue
    seen.add(title)
    labels.push(title)
    if (labels.length === RADAR_LIMIT) break
  }
  return labels
}
