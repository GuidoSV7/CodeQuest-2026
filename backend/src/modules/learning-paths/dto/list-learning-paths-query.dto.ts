import { IsIn, IsOptional } from 'class-validator'

export class ListLearningPathsQueryDto {
  @IsOptional()
  @IsIn(['active', 'archived', 'all'])
  status?: 'active' | 'archived' | 'all' = 'active'
}
