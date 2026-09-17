/**
 * Cron configuration for the DevTalles catalog scraper.
 *
 * Default mode is **platform** (external cron → CLI/HTTP manual trigger).
 * In-process scheduling is opt-in and disabled by default.
 */
export type CatalogCronMode = 'platform' | 'in-process'

export type CatalogCronConfig = {
  mode: CatalogCronMode
  /** Cron expression or platform schedule hint (e.g. `0 6 * * *` = 06:00 UTC daily). */
  schedule: string
  /** When mode=in-process, whether the embedded ticker is enabled. */
  inProcessEnabled: boolean
  lockTtlMs: number
  lockKey: string
}

export const DEFAULT_CATALOG_CRON_CONFIG: CatalogCronConfig = {
  mode: 'platform',
  schedule: '0 6 * * *',
  inProcessEnabled: false,
  lockTtlMs: 30 * 60 * 1000,
  lockKey: 'catalog:lock',
}

export function resolveCatalogCronConfig(
  env: Record<string, string | undefined> = process.env,
): CatalogCronConfig {
  const mode = (env.CATALOG_CRON_MODE === 'in-process'
    ? 'in-process'
    : 'platform') as CatalogCronMode

  return {
    mode,
    schedule: env.CATALOG_CRON_SCHEDULE ?? DEFAULT_CATALOG_CRON_CONFIG.schedule,
    inProcessEnabled:
      mode === 'in-process' && env.CATALOG_CRON_IN_PROCESS === 'true',
    lockTtlMs: Number(env.CATALOG_LOCK_TTL_MS ?? DEFAULT_CATALOG_CRON_CONFIG.lockTtlMs),
    lockKey: env.CATALOG_LOCK_KEY ?? DEFAULT_CATALOG_CRON_CONFIG.lockKey,
  }
}
