import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { CatalogSnapshot } from '../domain/catalog'

/** Resolved from Vitest cwd (`backend/`); the artifact lives at the repo root. */
const COURSE_CARD_EXAMPLE_PATH = path.resolve(process.cwd(), '../contracts/course-card.example.json')

export const EXAMPLE_COURSE_ID = '3306165'

export const EXAMPLE_COVER_IMAGE_URL =
  'https://import.cdn.thinkific.com/643563/ozPWxfNjQBKugksdaogB_VSCODE.jpg'

export function readCourseCardExample(): unknown {
  return JSON.parse(readFileSync(COURSE_CARD_EXAMPLE_PATH, 'utf8'))
}

/** Catalog snapshot whose course maps to `contracts/course-card.example.json`. */
export function buildExampleSnapshot(coverImageUrl: string | null = EXAMPLE_COVER_IMAGE_URL): CatalogSnapshot {
  return {
    version: 1,
    generatedAt: '2026-01-01T00:00:00.000Z',
    source: 'seed',
    courses: [
      {
        id: Number(EXAMPLE_COURSE_ID),
        slug: 'csharp',
        title: 'C#: Empieza tu camino en el lenguaje',
        subtitleLabel: null,
        metaDescription: null,
        description: 'Primeros pasos',
        coverImageUrl,
        previewYoutubeId: 'h9qGQuJGhTo',
        price: { amount: 40, currency: 'USD' },
        lessonCount: 120,
        videoHours: 11.5,
        instructor: 'Teddy Paz',
        hasSubtitles: false,
        prerequisites: ['Saber usar una computadora'],
        sections: [
          {
            index: 0,
            title: 'Sección 1',
            lessons: [{ index: 0, title: 'Bienvenida', isFreePreview: true }],
          },
        ],
        relatedCourses: [
          {
            id: null,
            slug: 'NET-Backend',
            title: '.NET Backend',
            url: 'https://cursos.devtalles.com/courses/NET-Backend',
          },
        ],
        learningPathUrl: null,
        sourceUrl: 'https://cursos.devtalles.com/courses/csharp',
        categories: ['all'],
        scrapedAt: '2026-01-01T00:00:00.000Z',
        relatedCourseIds: [],
        status: 'ok',
      },
    ],
    paths: [
      {
        id: 'ruta-c',
        title: 'Ruta C#',
        pagePath: '/pages/ruta-c',
        entries: [
          {
            bucket: 'REQUIRED',
            courseSlug: 'csharp',
            courseUrl: 'https://cursos.devtalles.com/courses/csharp',
            label: 'C#',
            tags: ['backend'],
            position: 0,
            courseId: Number(EXAMPLE_COURSE_ID),
          },
        ],
        buckets: { REQUIRED: [], RECOMMENDED: [], OPTIONAL: [], ANYTIME: [] },
        scrapedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    stats: {
      courseCount: 1,
      pathCount: 1,
      categoryCounts: { all: 1, wip: 0, free: 0, mini: 0, exclusive: 0, legacy: 0 },
    },
  }
}
