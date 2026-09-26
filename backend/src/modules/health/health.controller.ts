import { Controller, Get } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { releaseCommit } from '../../release'

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<{ status: string; db: 'up' | 'down'; timestamp: string; commit: string }> {
    let db: 'up' | 'down' = 'down'
    try {
      await this.dataSource.query('SELECT 1')
      db = 'up'
    } catch {
      db = 'down'
    }
    return { status: 'ok', db, timestamp: new Date().toISOString(), commit: releaseCommit() }
  }
}
