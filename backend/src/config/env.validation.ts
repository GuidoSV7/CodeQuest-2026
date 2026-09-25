import { z } from 'zod'

/** Env booleans arrive as strings: only the literal "true" is truthy. */
const boolString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true')

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // PostgreSQL / TypeORM
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1),
  DB_SYNCHRONIZE: boolString,
  DB_LOGGING: boolString,

  // Redis (catalog cache / locks)
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_USERNAME: z.string().default(''),
  REDIS_PASSWORD: z.string().default(''),

  // Catalog scraper
  CATALOG_CRON_MODE: z.enum(['platform', 'in-process']).default('platform'),
  CATALOG_CRON_SCHEDULE: z.string().default('0 6 * * *'),
  CATALOG_CRON_IN_PROCESS: boolString,
  CATALOG_LOCK_TTL_MS: z.coerce.number().int().positive().default(1_800_000),
  CATALOG_LOCK_KEY: z.string().default('catalog:lock'),
  CATALOG_SYNC_TOKEN: z.string().default('change-me'),

  // Discord OAuth + session (defaults for local/dev only)
  DISCORD_CLIENT_ID: z.string().default(''),
  DISCORD_CLIENT_SECRET: z.string().default(''),
  DISCORD_REDIRECT_URI: z
    .string()
    .default('http://localhost:3000/api/auth/discord/callback'),
  SESSION_JWT_SECRET: z
    .string()
    .default('dev-only-change-me-32chars-minimum!!'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  SESSION_COOKIE_NAME: z.string().default('cq_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  OAUTH_STATE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  SESSION_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  SESSION_COOKIE_SAMESITE: z.enum(['lax', 'none']).default('lax'),

  CLOUDINARY_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_BASE_FOLDER: z.string().default('CodeQuest'),
})

export const envSchema = baseEnvSchema
  .transform((data) => {
    const secure =
      data.SESSION_COOKIE_SECURE !== undefined
        ? data.SESSION_COOKIE_SECURE
        : data.NODE_ENV === 'production'
    return { ...data, SESSION_COOKIE_SECURE: secure }
  })
  .superRefine((data, ctx) => {
    if (
      data.SESSION_COOKIE_SAMESITE === 'none' &&
      data.SESSION_COOKIE_SECURE === false
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_COOKIE_SAMESITE'],
        message: 'SameSite=None requires SESSION_COOKIE_SECURE=true',
      })
    }

    if (data.NODE_ENV !== 'production') return

    if (!data.DISCORD_CLIENT_ID) {
      ctx.addIssue({
        code: 'custom',
        path: ['DISCORD_CLIENT_ID'],
        message: 'Required in production',
      })
    }
    if (!data.DISCORD_CLIENT_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['DISCORD_CLIENT_SECRET'],
        message: 'Required in production',
      })
    }
    if (!data.DISCORD_REDIRECT_URI) {
      ctx.addIssue({
        code: 'custom',
        path: ['DISCORD_REDIRECT_URI'],
        message: 'Required in production',
      })
    }
    if (!data.FRONTEND_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['FRONTEND_URL'],
        message: 'Required in production',
      })
    }
    if (data.SESSION_JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['SESSION_JWT_SECRET'],
        message: 'Must be at least 32 characters in production',
      })
    }
  })

export type Env = z.infer<typeof envSchema>

/** ConfigModule `validate` hook: fail fast with a readable message. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  return parsed.data
}
