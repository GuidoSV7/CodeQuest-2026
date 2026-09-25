import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

type AliasFile = {
  version: number
  entries: Array<{ path_id: string; aliases: string[] }>
}

const ALIAS_PATH = firstExisting([
  path.resolve(__dirname, 'path-aliases.json'),
  path.resolve(process.cwd(), 'src/modules/mcp-public/path-aliases.json'),
])

function firstExisting(candidates: string[]): string {
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0] ?? ''
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/[&+]/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordMatch(goal: string, alias: string): boolean {
  if (goal === alias) return true
  return new RegExp(`(^| )${alias}($| )`).test(goal)
}

export function matchOfficialPath(
  goal: string,
  availablePathIds?: ReadonlySet<string>,
): { pathId: string; alias: string } | null {
  const normalizedGoal = normalizeText(goal)
  const file = JSON.parse(readFileSync(ALIAS_PATH, 'utf8')) as AliasFile
  const matches: Array<{ pathId: string; alias: string }> = []
  for (const entry of file.entries) {
    for (const raw of entry.aliases) {
      const alias = normalizeText(raw)
      if (!alias || !wordMatch(normalizedGoal, alias)) continue
      if (availablePathIds && !availablePathIds.has(entry.path_id)) continue
      matches.push({ pathId: entry.path_id, alias })
    }
  }
  matches.sort((a, b) => {
    if (b.alias.length !== a.alias.length) return b.alias.length - a.alias.length
    return a.pathId < b.pathId ? -1 : a.pathId > b.pathId ? 1 : 0
  })
  return matches[0] ?? null
}

export function resolveOfficialPath(goal: string): string | null {
  return matchOfficialPath(goal)?.pathId ?? null
}
