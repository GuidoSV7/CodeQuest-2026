import path from 'node:path'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { DataSource } from 'typeorm'
import { UserOrmEntity } from '../modules/identity/infrastructure/user.orm-entity'
import { AuthAccountOrmEntity } from '../modules/identity/infrastructure/auth-account.orm-entity'
import { LearningPathOrmEntity } from '../modules/learning-paths/infrastructure/learning-path.orm-entity'
import { LearningPathItemOrmEntity } from '../modules/learning-paths/infrastructure/learning-path-item.orm-entity'
import { UserCourseProgressOrmEntity } from '../modules/learning-paths/infrastructure/user-course-progress.orm-entity'
import { InitAuthLearningPaths1758412800000 } from '../database/migrations/1758412800000-InitAuthLearningPaths'
import { McpOauth1758600000000 } from '../database/migrations/1758600000000-McpOauth'

const require = createRequire(import.meta.url)
const EmbeddedPostgres =
  require('embedded-postgres').default ?? require('embedded-postgres')

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)

export type PgTestContext = {
  dataSource: DataSource
  stop: () => Promise<void>
  host: string
  port: number
  database: string
  username: string
  password: string
}

let shared: PgTestContext | null = null
let starting: Promise<PgTestContext> | null = null

/**
 * Starts an embedded Postgres (no Docker), creates DB, returns a TypeORM DataSource
 * pointed at empty schema (caller runs migrations). Singleton per process.
 */
export async function startPgTestContext(): Promise<PgTestContext> {
  if (shared) return shared
  if (starting) return starting

  starting = (async () => {
    const databaseDir = path.join(backendRoot, `.pgdata-vitest-${process.pid}`)
    fs.rmSync(databaseDir, { recursive: true, force: true })

    const port = 55_000 + (process.pid % 1000)
    const username = 'postgres'
    const password = 'postgres'
    const database = 'codequest_test'

    const pg = new EmbeddedPostgres({
      databaseDir,
      user: username,
      password,
      port,
      persistent: false,
    })

    await pg.initialise()
    await pg.start()
    await pg.createDatabase(database)

    const dataSource = new DataSource({
      type: 'postgres',
      host: '127.0.0.1',
      port,
      username,
      password,
      database,
      synchronize: false,
      logging: false,
      entities: [
        UserOrmEntity,
        AuthAccountOrmEntity,
        LearningPathOrmEntity,
        LearningPathItemOrmEntity,
        UserCourseProgressOrmEntity,
      ],
      migrations: [InitAuthLearningPaths1758412800000, McpOauth1758600000000],
      migrationsTableName: 'migrations',
    })
    await dataSource.initialize()

    shared = {
      dataSource,
      host: '127.0.0.1',
      port,
      database,
      username,
      password,
      stop: async () => {
        if (dataSource.isInitialized) await dataSource.destroy()
        await pg.stop()
        fs.rmSync(databaseDir, { recursive: true, force: true })
        shared = null
        starting = null
      },
    }

    return shared
  })()

  return starting
}

export async function truncateAll(ds: DataSource): Promise<void> {
  await ds.query(`
    TRUNCATE TABLE
      user_course_progress,
      learning_path_items,
      learning_paths,
      questionnaire_responses,
      auth_accounts,
      users
    RESTART IDENTITY CASCADE
  `)
}
