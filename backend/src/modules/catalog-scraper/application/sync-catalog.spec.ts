import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  CatalogValidationError,
  type CatalogSnapshot,
} from '../domain/catalog'
import { createInMemoryRedis } from '../infrastructure/redis/in-memory-redis'
import { createRedisCatalogRepository } from '../infrastructure/redis/redis-catalog.repository'
import type { HttpClient } from '../ports/http-client.port'
import { syncCatalog } from './sync-catalog'
import { exportCatalogSeed, importCatalogSeed } from './seed'
import { validateCatalog } from './validate-catalog'

const FIX = path.resolve(process.cwd(), 'test/fixtures/devtalles')

function fixture(name: string): string {
  return readFileSync(path.join(FIX, name), 'utf8')
}

const SIX_LISTINGS = [
  { category: 'all' as const, path: '/pages/todos-los-cursos' },
  { category: 'free' as const, path: '/pages/todos-los-cursos-gratuitos' },
  { category: 'wip' as const, path: '/pages/todos-los-cursos-en-construccion' },
  { category: 'mini' as const, path: '/pages/todos-los-cursos-minicursos' },
  {
    category: 'exclusive' as const,
    path: '/pages/todos-los-cursos-exclusivos',
  },
  { category: 'legacy' as const, path: '/pages/todos-los-cursos-legacy' },
]

function twoCourseListingHtml(): string {
  return `<html><body>
    <li class="products__list-item"><a class="card card--published card--curso" href="/courses/visual-studio-code">
      <h3 class="card__name">VSCode</h3>
      <p class="card__description">desc</p>
      <p class="card__price"><span class="card__badge card__badge--free">Gratis</span></p>
    </a></li>
    <li class="products__list-item"><a class="card card--published card--curso" href="/courses/golang-backend-profesional">
      <h3 class="card__name">Go</h3>
      <p class="card__description">desc</p>
      <p class="card__price"><strong>$60</strong></p>
    </a></li>
  </body></html>`
}

function oneCourseListingHtml(): string {
  return `<html><body>
    <li class="products__list-item"><a class="card card--published card--curso" href="/courses/visual-studio-code">
      <h3 class="card__name">VSCode</h3>
      <p class="card__price"><span class="card__badge card__badge--free">Gratis</span></p>
    </a></li>
  </body></html>`
}

describe('validateCatalog', () => {
  it('fails when below minCourses and does not accept empty', () => {
    const snap: CatalogSnapshot = {
      version: 1,
      generatedAt: '2026-09-16T00:00:00.000Z',
      source: 'scraper',
      courses: [],
      paths: [],
      stats: {
        courseCount: 0,
        pathCount: 0,
        categoryCounts: {
          all: 0,
          wip: 0,
          free: 0,
          mini: 0,
          exclusive: 0,
          legacy: 0,
        },
      },
    }
    expect(() =>
      validateCatalog(snap, {
        minCourses: 1,
        expectedPathCount: 0,
        maxFailRatio: 0.05,
      }),
    ).toThrow(CatalogValidationError)
  })
})

describe('syncCatalog', () => {
  it('discovers from listings, enriches courses/paths, persists, and returns summary', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis)

    const http: HttpClient = {
      async getText(url: string) {
        if (url.includes('/pages/todos-los-cursos-gratuitos')) {
          return twoCourseListingHtml()
        }
        if (
          url.includes('/pages/todos-los-cursos') &&
          !url.includes('todos-los-cursos-')
        ) {
          return twoCourseListingHtml()
        }
        if (url.includes('/pages/todos-los-cursos-')) {
          return oneCourseListingHtml()
        }
        if (url.includes('/courses/visual-studio-code')) {
          return fixture('course-free.html')
        }
        if (url.includes('/courses/golang-backend-profesional')) {
          return fixture('course-paid.html')
        }
        if (url.includes('/pages/ruta-python')) {
          return fixture('path-ruta-python.html')
        }
        throw new Error(`unexpected ${url}`)
      },
    }

    const summary = await syncCatalog({
      http,
      catalogRepository: repo,
      config: {
        baseUrl: 'https://cursos.devtalles.com',
        userAgent: 'test',
        timeoutMs: 1000,
        maxRetries: 0,
        backoffBaseMs: 1,
        maxConcurrency: 3,
        minIntervalMs: 0,
        minCourses: 2,
        maxFailRatio: 0.5,
        listingPages: SIX_LISTINGS,
        pathIds: ['ruta-python'],
        retainPreviousVersions: 1,
      },
      now: () => new Date('2026-09-16T12:00:00.000Z'),
    })

    expect(summary.persisted).toBe(true)
    expect(summary.coursesFound).toBe(2)
    expect(summary.pathsFound).toBe(1)
    expect(summary.version).toBe(1)

    const current = await repo.getCurrent()
    expect(current?.courses).toHaveLength(2)
    const vscode = current!.courses.find((c) => c.slug === 'visual-studio-code')
    expect(vscode?.categories).toEqual(
      expect.arrayContaining(['all', 'free']),
    )
    expect(vscode?.categories.length).toBeGreaterThanOrEqual(2)
    expect(summary.warnings.some((w) => /path entry/i.test(w))).toBe(true)
  })

  it('aborts without persisting when validation fails', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis)
    const save = vi.spyOn(repo, 'save')

    const http: HttpClient = {
      async getText(url: string) {
        if (url.includes('/pages/')) return oneCourseListingHtml()
        return fixture('course-free.html')
      },
    }

    await expect(
      syncCatalog({
        http,
        catalogRepository: repo,
        config: {
          baseUrl: 'https://cursos.devtalles.com',
          userAgent: 'test',
          timeoutMs: 1000,
          maxRetries: 0,
          backoffBaseMs: 1,
          maxConcurrency: 2,
          minIntervalMs: 0,
          minCourses: 50,
          maxFailRatio: 0.05,
          listingPages: [{ category: 'all', path: '/pages/todos-los-cursos' }],
          pathIds: [],
          retainPreviousVersions: 1,
        },
      }),
    ).rejects.toBeInstanceOf(CatalogValidationError)

    expect(save).not.toHaveBeenCalled()
    expect(await repo.getCurrent()).toBeNull()
  })

  it('continues on single course failure under fail ratio', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis)

    const http: HttpClient = {
      async getText(url: string) {
        if (
          url.includes('/pages/todos-los-cursos') &&
          !url.includes('todos-los-cursos-')
        ) {
          return `<html><body>
            <a class="card card--curso" href="/courses/visual-studio-code"><h3 class="card__name">VS</h3><p class="card__price"><span class="card__badge card__badge--free">Gratis</span></p></a>
            <a class="card card--curso" href="/courses/golang-backend-profesional"><h3 class="card__name">Go</h3><p class="card__price"><strong>$60</strong></p></a>
            <a class="card card--curso" href="/courses/missing-course"><h3 class="card__name">X</h3><p class="card__price"><strong>$1</strong></p></a>
          </body></html>`
        }
        if (url.includes('/pages/')) return oneCourseListingHtml()
        if (url.includes('missing-course')) throw new Error('network down')
        if (url.includes('visual-studio-code')) return fixture('course-free.html')
        if (url.includes('golang-backend-profesional')) {
          return fixture('course-paid.html')
        }
        throw new Error(url)
      },
    }

    const summary = await syncCatalog({
      http,
      catalogRepository: repo,
      config: {
        baseUrl: 'https://cursos.devtalles.com',
        userAgent: 'test',
        timeoutMs: 1000,
        maxRetries: 0,
        backoffBaseMs: 1,
        maxConcurrency: 3,
        minIntervalMs: 0,
        minCourses: 2,
        maxFailRatio: 0.5,
        listingPages: SIX_LISTINGS,
        pathIds: [],
        retainPreviousVersions: 1,
      },
    })

    expect(summary.courseParseErrors).toBe(1)
    expect(summary.coursesFound).toBe(2)
    expect(summary.persisted).toBe(true)
  })

  it('skips WIP/incomplete detail pages (missing price or enroll) without counting as parse errors', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis)

    const http: HttpClient = {
      async getText(url: string) {
        if (
          url.includes('/pages/todos-los-cursos') &&
          !url.includes('todos-los-cursos-')
        ) {
          return `<html><body>
            <a class="card card--curso" href="/courses/visual-studio-code"><h3 class="card__name">VS</h3><p class="card__price"><span class="card__badge card__badge--free">Gratis</span></p></a>
            <a class="card card--curso" href="/courses/wip-no-price"><h3 class="card__name">WIP A</h3><p class="card__price"><strong>$10</strong></p></a>
            <a class="card card--curso" href="/courses/wip-no-enroll"><h3 class="card__name">WIP B</h3><p class="card__price"><strong>$10</strong></p></a>
            <a class="card card--curso" href="/courses/broken-course"><h3 class="card__name">Broken</h3><p class="card__price"><strong>$10</strong></p></a>
          </body></html>`
        }
        if (url.includes('/pages/')) return oneCourseListingHtml()
        if (url.includes('visual-studio-code')) return fixture('course-free.html')
        if (url.includes('wip-no-price')) {
          return `<html><body>
            <a href="/enroll/999001">Buy</a>
            <h2 class="section__heading">WIP A</h2>
            <div class="course-details"></div>
          </body></html>`
        }
        if (url.includes('wip-no-enroll')) {
          return `<html><body><h2 class="section__heading">WIP B</h2></body></html>`
        }
        if (url.includes('broken-course')) throw new Error('network down')
        throw new Error(url)
      },
    }

    const summary = await syncCatalog({
      http,
      catalogRepository: repo,
      config: {
        baseUrl: 'https://cursos.devtalles.com',
        userAgent: 'test',
        timeoutMs: 1000,
        maxRetries: 0,
        backoffBaseMs: 1,
        maxConcurrency: 3,
        minIntervalMs: 0,
        minCourses: 1,
        // With 1 real failure + 2 WIP skips among 4 attempted, fail ratio is 0.25
        // only if WIP counts — must stay under 0.3 by treating WIP as skips.
        maxFailRatio: 0.3,
        listingPages: SIX_LISTINGS,
        pathIds: [],
        retainPreviousVersions: 1,
      },
    })

    expect(summary.coursesFound).toBe(1)
    expect(summary.courseParseErrors).toBe(1)
    expect(summary.persisted).toBe(true)
    expect(
      summary.warnings.some((w) =>
        /skipped incomplete\/WIP course detail for wip-no-price/i.test(w),
      ),
    ).toBe(true)
    expect(
      summary.warnings.some((w) =>
        /skipped incomplete\/WIP course detail for wip-no-enroll/i.test(w),
      ),
    ).toBe(true)
    expect(
      summary.warnings.some((w) =>
        /course detail failed for broken-course/i.test(w),
      ),
    ).toBe(true)
  })
})

describe('seed export/import', () => {
  it('exports current catalog and imports into Redis', async () => {
    const redis = createInMemoryRedis()
    const repo = createRedisCatalogRepository(redis)

    const catalog: CatalogSnapshot = {
      version: 3,
      generatedAt: '2026-09-16T00:00:00.000Z',
      source: 'scraper',
      courses: [
        {
          id: 1,
          slug: 'a',
          title: 'A',
          subtitleLabel: null,
          metaDescription: null,
          description: null,
          coverImageUrl: null,
          previewYoutubeId: null,
          price: { amount: 0, currency: 'USD' },
          lessonCount: null,
          videoHours: null,
          instructor: null,
          hasSubtitles: false,
          prerequisites: [],
          sections: [],
          relatedCourses: [],
          learningPathUrl: null,
          sourceUrl: 'https://cursos.devtalles.com/courses/a',
          categories: ['all'],
          scrapedAt: '2026-09-16T00:00:00.000Z',
          relatedCourseIds: [],
          status: 'ok',
        },
      ],
      paths: [],
      stats: {
        courseCount: 1,
        pathCount: 0,
        categoryCounts: {
          all: 1,
          wip: 0,
          free: 0,
          mini: 0,
          exclusive: 0,
          legacy: 0,
        },
      },
    }

    await repo.save(catalog)
    const json = await exportCatalogSeed(repo)
    const parsed = JSON.parse(json) as CatalogSnapshot
    expect(parsed.source).toBe('seed')
    expect(parsed.version).toBe(0)

    const redis2 = createInMemoryRedis()
    const repo2 = createRedisCatalogRepository(redis2)
    const imported = await importCatalogSeed(repo2, json)
    expect(imported.version).toBe(1)
    expect(imported.source).toBe('seed')
    const current = await repo2.getCurrent()
    expect(current?.courses[0]?.slug).toBe('a')
  })
})
