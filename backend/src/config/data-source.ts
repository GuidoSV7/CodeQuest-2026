import 'reflect-metadata'
import { config as loadDotenv } from 'dotenv'
import { DataSource } from 'typeorm'
import { buildTypeOrmOptions } from './database.config'
import { validateEnv } from './env.validation'

// CLI entrypoint for TypeORM migrations (npm run migration:*).
loadDotenv()
const env = validateEnv(process.env)

// TypeORM CLI requires exactly one DataSource export.
export default new DataSource(buildTypeOrmOptions(env))
