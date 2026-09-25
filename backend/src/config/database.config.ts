import { join } from 'node:path'
import type { DataSourceOptions } from 'typeorm'
import type { Env } from './env.validation'

/**
 * Single source of truth for TypeORM options — used by the Nest app
 * (forRootAsync) and the CLI DataSource (migrations).
 */
export function buildTypeOrmOptions(
  env: Pick<
    Env,
    | 'DB_HOST'
    | 'DB_PORT'
    | 'DB_USERNAME'
    | 'DB_PASSWORD'
    | 'DB_NAME'
    | 'DB_SYNCHRONIZE'
    | 'DB_LOGGING'
  >,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    synchronize: env.DB_SYNCHRONIZE,
    logging: env.DB_LOGGING,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [
      join(__dirname, '..', 'database', 'migrations', '[0-9]*.{ts,js}'),
    ],
    migrationsRun: true,
  }
}
