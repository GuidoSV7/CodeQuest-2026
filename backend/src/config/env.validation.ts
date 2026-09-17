import { z } from 'zod'

/** Env booleans arrive as strings: only the literal "true" is truthy. */
const boolString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true')

export const envSchema = z.object({
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

  // Catalog scraper
  CATALOG_CRON_MODE: z.enum(['platform', 'in-process']).default('platform'),
  CATALOG_CRON_SCHEDULE: z.string().default('0 6 * * *'),
  CATALOG_CRON_IN_PROCESS: boolString,
  CATALOG_LOCK_TTL_MS: z.coerce.number().int().positive().default(1_800_000),
  CATALOG_LOCK_KEY: z.string().default('catalog:lock'),
  CATALOG_SYNC_TOKEN: z.string().default('change-me'),
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
