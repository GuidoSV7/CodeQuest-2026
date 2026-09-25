import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import type { CatalogRepository } from '../catalog-scraper/ports/catalog-repository.port'

export type CatalogLoad = {
  snapshot: CatalogSnapshot
  fromSeed: boolean
}

export type CatalogCache = {
  load(): Promise<CatalogLoad>
}

const SEED_PATH = firstExisting([
  path.resolve(__dirname, '../catalog-scraper/data/catalog.seed.json'),
  path.resolve(process.cwd(), 'src/modules/catalog-scraper/data/catalog.seed.json'),
])

function firstExisting(candidates: string[]): string {
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0] ?? ''
}

export function readCatalogSeedFile(): CatalogSnapshot {
  return JSON.parse(readFileSync(SEED_PATH, 'utf8')) as CatalogSnapshot
}

/**
 * In-process snapshot cache. Invalidates when `CatalogRepository.getCurrent()`
 * returns a different `version`. A thrown or null read falls back to seed once.
 */
export function createCatalogCache(deps: {
  repository: CatalogRepository
  readSeed?: () => CatalogSnapshot
}): CatalogCache {
  const readSeed = deps.readSeed ?? readCatalogSeedFile
  let cached: CatalogLoad | null = null

  return {
    async load() {
      try {
        const snapshot = await deps.repository.getCurrent()
        if (!snapshot) return useSeed()
        if (
          cached &&
          !cached.fromSeed &&
          cached.snapshot.version === snapshot.version
        ) {
          return cached
        }
        cached = { snapshot, fromSeed: false }
        return cached
      } catch {
        return useSeed()
      }
    },
  }

  function useSeed(): CatalogLoad {
    if (cached?.fromSeed) return cached
    cached = { snapshot: readSeed(), fromSeed: true }
    return cached
  }
}
