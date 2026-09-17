import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CATALOG_CRON_CONFIG,
  resolveCatalogCronConfig,
} from './cron-config'

describe('resolveCatalogCronConfig', () => {
  it('defaults to platform mode with daily schedule', () => {
    const cfg = resolveCatalogCronConfig({})
    expect(cfg.mode).toBe('platform')
    expect(cfg.inProcessEnabled).toBe(false)
    expect(cfg.schedule).toBe(DEFAULT_CATALOG_CRON_CONFIG.schedule)
  })

  it('enables in-process only when explicitly opted in', () => {
    const cfg = resolveCatalogCronConfig({
      CATALOG_CRON_MODE: 'in-process',
      CATALOG_CRON_IN_PROCESS: 'true',
      CATALOG_CRON_SCHEDULE: '0 3 * * *',
    })
    expect(cfg.mode).toBe('in-process')
    expect(cfg.inProcessEnabled).toBe(true)
    expect(cfg.schedule).toBe('0 3 * * *')
  })
})
