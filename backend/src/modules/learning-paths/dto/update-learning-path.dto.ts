import { IsIn, IsOptional, IsString, Length } from 'class-validator'

export class UpdateLearningPathDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string

  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: 'active' | 'archived'
}
