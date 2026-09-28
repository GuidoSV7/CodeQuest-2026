import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { toCourseCard } from '../application/course-card'
import type { CatalogSnapshot } from '../domain/catalog'
import { DEFAULT_SCRAPER_CONFIG } from '../domain/config'
import type { CatalogLock } from '../ports/catalog-lock.port'
import type { CatalogRepository } from '../ports/catalog-repository.port'
import type { HttpClient } from '../ports/http-client.port'
import { buildExampleSnapshot, EXAMPLE_COURSE_ID, readCourseCardExample } from '../test/course-card-example'
import { CatalogScraperController } from './catalog-scraper.controller'
import { CatalogScraperService } from './catalog-scraper.service'

const unusedHttp: HttpClient = {
  getText: () => Promise.reject(new Error('GET /catalog/courses must not hit the network')),
}

const unusedLock: CatalogLock = {
  tryAcquire: () => Promise.reject(new Error('GET /catalog/courses must not take the lock')),
  release: () => Promise.reject(new Error('GET /catalog/courses must not take the lock')),
}

// Built by hand: the controller injects by type and Vitest (esbuild) emits no decorator metadata.
describe('CatalogScraperController GET /catalog/courses/:courseId', () => {
  let snapshot: CatalogSnapshot | null
  let service: CatalogScraperService
  let controller: CatalogScraperController

  beforeEach(() => {
    snapshot = buildExampleSnapshot()
    const repo: CatalogRepository = {
      getCurrent: async () => snapshot,
      save: async (catalog) => catalog,
    }
    service = new CatalogScraperService(unusedHttp, repo, unusedLock, DEFAULT_SCRAPER_CONFIG)
    controller = new CatalogScraperController(service, new ConfigService())
  })

  it('returns 200 { course } with the mapped course card', async () => {
    const expected = toCourseCard(buildExampleSnapshot(), EXAMPLE_COURSE_ID)

    await expect(controller.course(EXAMPLE_COURSE_ID)).resolves.toStrictEqual({ course: expected })
  })

  it('returns the shared contract example with the validated cover', async () => {
    await expect(controller.course(EXAMPLE_COURSE_ID)).resolves.toStrictEqual({
      course: readCourseCardExample(),
    })
  })

  it('keeps coverImageUrl present as null when the course has no cover', async () => {
    snapshot = buildExampleSnapshot(null)

    const { course } = await controller.course(EXAMPLE_COURSE_ID)

    expect('coverImageUrl' in course).toBe(true)
    expect(course.coverImageUrl).toBeNull()
  })

  it('returns 404 when the course does not exist', async () => {
    const error = await controller.course('999').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(NotFoundException)
    expect(error instanceof NotFoundException && error.getStatus()).toBe(404)
  })

  it('returns 404 when there is no catalog snapshot yet', async () => {
    snapshot = null

    const error = await controller.course(EXAMPLE_COURSE_ID).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(NotFoundException)
  })

  it.each(['abc', '1234567890123'])('returns 400 for courseId %s without reading the catalog', async (courseId) => {
    const getCourseCard = vi.spyOn(service, 'getCourseCard')

    const error = await controller.course(courseId).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(BadRequestException)
    expect(error instanceof BadRequestException && error.getStatus()).toBe(400)
    expect(getCourseCard).not.toHaveBeenCalled()
  })
})
