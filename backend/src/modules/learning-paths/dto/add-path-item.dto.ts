import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

const BUCKETS = ['required', 'recommended', 'optional', 'anytime'] as const

export class AddPathItemDto {
  @IsString()
  courseId!: string

  @IsOptional()
  @IsIn([...BUCKETS, null])
  bucket?: (typeof BUCKETS)[number] | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number
}
