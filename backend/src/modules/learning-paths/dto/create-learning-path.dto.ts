import { Type } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

const BUCKETS = ['required', 'recommended', 'optional', 'anytime'] as const

export class CreatePathItemDto {
  @IsString()
  courseId!: string

  @IsOptional()
  @IsIn(BUCKETS)
  bucket?: (typeof BUCKETS)[number] | null
}

/**
 * Discriminated by `kind`. Only `custom` and `official` are accepted
 * (`generated` is model-supported but has no create endpoint in this phase).
 */
export class CreateLearningPathDto {
  @IsIn(['custom', 'official'])
  kind!: 'custom' | 'official'

  /** Required for custom; optional override for official (defaults to catalog title). */
  @ValidateIf(
    (o: CreateLearningPathDto) =>
      o.kind === 'custom' || o.title !== undefined,
  )
  @IsString()
  @Length(1, 200)
  title?: string

  @ValidateIf((o: CreateLearningPathDto) => o.kind === 'custom')
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePathItemDto)
  @ArrayUnique((item: CreatePathItemDto) => item.courseId)
  items?: CreatePathItemDto[]

  @ValidateIf((o: CreateLearningPathDto) => o.kind === 'official')
  @IsString()
  @Length(1, 128)
  catalogPathId?: string
}
