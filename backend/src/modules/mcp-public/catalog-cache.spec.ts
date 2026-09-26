import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { CatalogSnapshot } from '../catalog-scraper/domain/catalog'
import type { CatalogRepository } from '../catalog-scraper/ports/catalog-repository.port'
import { createCatalogCache } from './catalog-cache'

const SEED_PATH = path.resolve(
  process.cwd(),
  'src/modules/catalog-scraper/data/catalog.seed.json',
)

function course(
  id: number,
  slug: string,
  title: string,
): CatalogSnapshot['courses'][number] {
  return {
    id,
    slug,
    title,
    subtitleLabel: null,
    metaDescription: null,
    description: null,
    coverImageUrl: null,
    previewYoutubeId: null,
    price: { amount: 10, currency: 'USD' },
    lessonCount: 1,
    videoHours: 1,
    instructor: null,
    hasSubtitles: false,
    prerequisites: [],
    sections: [],
    relatedCourses: [],
    learningPathUrl: null,
    sourceUrl: `https://cursos.devtalles.com/courses/${slug}`,
    categories: ['all'],
    scrapedAt: '2026-09-21T00:00:00.000Z',
    relatedCourseIds: [],
    status: 'ok',
  }
}

function snapshot(version: number, courses = [course(1, 'react-de-cero', 'React')]): CatalogSnapshot {
  return {
    version,
    generatedAt: '2026-09-21T00:00:00.000Z',
    source: 'scraper',
    courses,
    paths: [],
    stats: {
      courseCount: courses.length,
      pathCount: 0,
      categoryCounts: {
        all: courses.length,
        wip: 0,
        free: 0,
        mini: 0,
        exclusive: 0,
        legacy: 0,
      },
    },
  }
}

describe('catalog cache', () => {
  it('keeps the in-memory snapshot until catalog version changes', async () => {
    const v1 = snapshot(1)
    const v2 = snapshot(2, [course(2, 'nest', 'Nest')])
    let current = v1
    const repo: CatalogRepository = {
      async getCurrent() {
        return current
      },
      async save(catalog) {
        return catalog
      },
    }
    const cache = createCatalogCache({
      repository: repo,
      readSeed: () => snapshot(0),
    })

    const first = await cache.load()
    const again = await cache.load()
    expect(again.snapshot).toBe(first.snapshot)
    expect(again.snapshot.version).toBe(1)

    current = v2
    const next = await cache.load()
    expect(next.snapshot).not.toBe(first.snapshot)
    expect(next.snapshot.version).toBe(2)
    expect(next.snapshot.courses[0]?.slug).toBe('nest')
  })

  it('falls back to the seed when Redis throws and reads the seed once', async () => {
    const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as CatalogSnapshot
    const readSeed = vi.fn(() => seed)
    const repo: CatalogRepository = {
      async getCurrentVersion() {
        throw new Error('redis down')
      },
      async getCurrent() {
        throw new Error('redis down')
      },
      async save(catalog) {
        return catalog
      },
    }
    const cache = createCatalogCache({ repository: repo, readSeed })

    const first = await cache.load()
    const second = await cache.load()
    expect(first.fromSeed).toBe(true)
    expect(first.snapshot.source).toBe('seed')
    expect(second).toBe(first)
    expect(readSeed).toHaveBeenCalledTimes(1)
  })

  it('throws catalog_unavailable only when Redis and the seed both fail', async () => {
    const repo: CatalogRepository = {
      async getCurrentVersion() {
        throw new Error('redis down')
      },
      async getCurrent() {
        throw new Error('redis down')
      },
      async save(catalog) {
        return catalog
      },
    }
    const cache = createCatalogCache({
      repository: repo,
      readSeed: () => {
        throw new Error('seed missing')
      },
    })
    await expect(cache.load()).rejects.toMatchObject({ message: 'catalog_unavailable' })
  })
})

describe('catalog version window', () => {
  it('does not read the snapshot again inside the window, and reloads once when the pointer changes', async () => {
    let now = 1_000
    let pointer: string | null = 'v1'
    const v1 = snapshot(1)
    const v2 = snapshot(2, [course(2, 'nest', 'Nest')])
    const versionReads = vi.fn(async () => pointer)
    const snapshotReads = vi.fn(async () => (pointer === 'v2' ? v2 : v1))
    const repo: CatalogRepository = {
      getCurrentVersion: versionReads,
      getCurrent: snapshotReads,
      async save(catalog) {
        return catalog
      },
    }
    const cache = createCatalogCache({
      repository: repo,
      now: () => now,
      versionCheckIntervalMs: 30_000,
      readSeed: () => snapshot(0),
    })

    await cache.load()
    for (let i = 0; i < 8; i += 1) await cache.load()
    expect(snapshotReads).toHaveBeenCalledTimes(1)
    expect(versionReads).toHaveBeenCalledTimes(1)

    now += 30_000
    pointer = 'v2'
    const next = await cache.load()
    expect(versionReads).toHaveBeenCalledTimes(2)
    expect(snapshotReads).toHaveBeenCalledTimes(2)
    expect(next.snapshot.version).toBe(2)
  })
})
