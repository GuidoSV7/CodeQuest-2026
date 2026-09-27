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

function collectMatches(
  goal: string,
  availablePathIds?: ReadonlySet<string>,
  entries?: AliasFile['entries'],
): Array<{ pathId: string; alias: string }> {
  const normalizedGoal = normalizeText(goal)
  const file = entries
    ? { version: 0, entries }
    : (JSON.parse(readFileSync(ALIAS_PATH, 'utf8')) as AliasFile)
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
  return matches
}

export function matchOfficialPath(
  goal: string,
  availablePathIds?: ReadonlySet<string>,
  entries?: AliasFile['entries'],
): { pathId: string; alias: string } | null {
  return collectMatches(goal, availablePathIds, entries)[0] ?? null
}

export function tiedOfficialPaths(
  goal: string,
  availablePathIds: ReadonlySet<string>,
  titles: ReadonlyMap<string, string>,
  entries?: AliasFile['entries'],
): Array<{ path_id: string; title: string; alias: string }> {
  const matches = collectMatches(goal, availablePathIds, entries)
  const winner = matches[0]
  if (!winner) return []
  const tied = matches.filter((match) => match.alias.length === winner.alias.length)
  const unique = new Map<string, { path_id: string; title: string; alias: string }>()
  for (const match of tied) {
    unique.set(match.pathId, {
      path_id: match.pathId,
      title: titles.get(match.pathId) ?? match.pathId,
      alias: match.alias,
    })
  }
  return unique.size > 1 ? [...unique.values()] : []
}

export function resolveOfficialPath(goal: string): string | null {
  return matchOfficialPath(goal)?.pathId ?? null
}
