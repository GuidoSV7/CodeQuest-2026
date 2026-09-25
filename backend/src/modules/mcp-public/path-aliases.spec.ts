import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { OFFICIAL_PATH_IDS } from '../catalog-scraper/domain/config'
import { matchOfficialPath } from './resolve-alias'

const ALIAS_PATH = path.resolve(
  process.cwd(),
  'src/modules/mcp-public/path-aliases.json',
)

describe('path aliases', () => {
  it('points every alias entry at an official path id', () => {
    const file = JSON.parse(readFileSync(ALIAS_PATH, 'utf8')) as {
      entries: Array<{ path_id: string }>
    }
    const official = new Set<string>(OFFICIAL_PATH_IDS)
    expect(file.entries.length).toBeGreaterThan(0)
    for (const entry of file.entries) {
      expect(official.has(entry.path_id)).toBe(true)
    }
  })

  it('breaks an equal-length tie by lexicographic path_id', () => {
    const winner = matchOfficialPath('aa', undefined, [
      { path_id: 'ruta-z', aliases: ['aa'] },
      { path_id: 'ruta-a', aliases: ['aa'] },
    ])
    expect(winner?.pathId).toBe('ruta-a')
  })
})
