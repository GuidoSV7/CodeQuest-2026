import type { CourseCategory } from './catalog'

export const SITE_ORIGIN = 'https://cursos.devtalles.com'

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export const LISTING_PAGES: ReadonlyArray<{
  category: CourseCategory
  path: string
}> = [
  { category: 'all', path: '/pages/todos-los-cursos' },
  { category: 'wip', path: '/pages/todos-los-cursos-en-construccion' },
  { category: 'free', path: '/pages/todos-los-cursos-gratuitos' },
  { category: 'mini', path: '/pages/todos-los-cursos-minicursos' },
  { category: 'exclusive', path: '/pages/todos-los-cursos-exclusivos' },
  { category: 'legacy', path: '/pages/todos-los-cursos-legacy' },
]

export const OFFICIAL_PATH_IDS = [
  'programas-fundamentos',
  'programas-react',
  'programas-vue',
  'programas-angular',
  'programas-node',
  'programas-nest',
  'ruta-dart',
  'ruta-python',
  'ruta-java',
  'ruta-c',
  'ruta-ia',
  'ruta-php',
  'ruta-go',
] as const

export type ScraperConfig = {
  baseUrl: string
  userAgent: string
  timeoutMs: number
  maxRetries: number
  /** Base delay for exponential backoff (attempt 0 → base, then *2). */
  backoffBaseMs: number
  maxConcurrency: number
  /** Minimum ms between request starts (rate limit). 0 disables. */
  minIntervalMs: number
  minCourses: number
  maxFailRatio: number
  listingPages: ReadonlyArray<{ category: CourseCategory; path: string }>
  pathIds: readonly string[]
  retainPreviousVersions: number
}

export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  baseUrl: SITE_ORIGIN,
  userAgent: DEFAULT_USER_AGENT,
  timeoutMs: 45_000,
  maxRetries: 3,
  backoffBaseMs: 1_000,
  maxConcurrency: 3,
  minIntervalMs: 1_000,
  minCourses: 50,
  maxFailRatio: 0.05,
  listingPages: LISTING_PAGES,
  pathIds: OFFICIAL_PATH_IDS,
  retainPreviousVersions: 1,
}
