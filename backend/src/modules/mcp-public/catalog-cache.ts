import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { Logger } from '@nestjs/common'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import type { CatalogRepository } from '../catalog-scraper/ports/catalog-repository.port'
import { McpToolError } from './catalog-read'
import { briefError } from './mcp-tool-log'

const cacheLogger = new Logger('CatalogCache')

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

const DEFAULT_VERSION_CHECK_MS = 30_000

/**
 * In-process snapshot cache. When the repository exposes `getCurrentVersion`,
 * that pointer is read at most once per interval and the full snapshot is
 * fetched only when the pointer changes. A thrown or null read falls back to seed.
 */
export function createCatalogCache(deps: {
  repository: CatalogRepository
  readSeed?: () => CatalogSnapshot
  now?: () => number
  versionCheckIntervalMs?: number
}): CatalogCache {
  const readSeed = deps.readSeed ?? readCatalogSeedFile
  const now = deps.now ?? Date.now
  const interval = deps.versionCheckIntervalMs ?? DEFAULT_VERSION_CHECK_MS
  let cached: CatalogLoad | null = null
  let cachedPointer: string | null = null
  let lastVersionCheckAt = Number.NEGATIVE_INFINITY

  return {
    async load() {
      if (deps.repository.getCurrentVersion) return loadByPointer()
      return loadFullSnapshot()
    },
  }

  async function loadByPointer(): Promise<CatalogLoad> {
    const t = now()
    if (cached && !cached.fromSeed && t - lastVersionCheckAt < interval) {
      return cached
    }
    try {
      const pointer = await deps.repository.getCurrentVersion!()
      lastVersionCheckAt = t
      if (!pointer) return useSeed()
      if (cached && !cached.fromSeed && cachedPointer === pointer) {
        return cached
      }
      const snapshot = await deps.repository.getCurrent()
      if (!snapshot) return useSeed()
      cachedPointer = pointer
      cached = { snapshot, fromSeed: false }
      return cached
    } catch {
      return useSeed()
    }
  }

  async function loadFullSnapshot(): Promise<CatalogLoad> {
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
  }

  function useSeed(): CatalogLoad {
    if (cached?.fromSeed) return cached
    try {
      cachedPointer = null
      cached = { snapshot: readSeed(), fromSeed: true }
      return cached
    } catch (error) {
      if (cached) return cached
      cacheLogger.error(
        { event: 'catalog_read_failed', result: 'catalog_unavailable', err: briefError(error) },
        'Catalog read failed',
      )
      throw new McpToolError('catalog_unavailable')
    }
  }
}
