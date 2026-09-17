import { readFileSync } from 'node:fs'
import path from 'node:path'

/** Resolved from Vitest cwd (`backend/`). */
const FIXTURES_DIR = path.resolve(process.cwd(), 'test/fixtures/devtalles')

export function loadFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf8')
}
