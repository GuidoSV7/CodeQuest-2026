import { describe, expect, it, vi } from 'vitest'
import { parseSyncCliArgs, runSyncCli } from './sync-catalog.cli'

describe('sync-catalog CLI', () => {
  it('parses --dry-run flag', () => {
    expect(parseSyncCliArgs(['node', 'cli', '--dry-run']).dryRun).toBe(true)
    expect(parseSyncCliArgs(['node', 'cli']).dryRun).toBe(false)
  })

  it('returns exit code 0 on successful manual sync', async () => {
    const code = await runSyncCli({
      dryRun: false,
      sync: vi.fn(async () => ({
        coursesFound: 1,
        courseParseErrors: 0,
        pathsFound: 0,
        warnings: [],
        diff: {
          addedCourseIds: [],
          removedCourseIds: [],
          changedCourseIds: [],
          addedPathIds: [],
          removedPathIds: [],
        },
        version: 1,
        persisted: true,
      })),
    })
    expect(code).toBe(0)
  })

  it('returns exit code 1 when sync fails', async () => {
    const code = await runSyncCli({
      dryRun: false,
      sync: vi.fn(async () => {
        throw new Error('fail')
      }),
    })
    expect(code).toBe(1)
  })
})
