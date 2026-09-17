import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

/** Contrato único de paginación: `?page=1&pageSize=20` (pageSize máx 100). */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20

  get skip(): number {
    return (this.page - 1) * this.pageSize
  }

  get take(): number {
    return this.pageSize
  }
}
