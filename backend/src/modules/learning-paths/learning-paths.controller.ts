import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import { CurrentUserId } from '../identity/presentation/current-user.decorator'
import { SessionAuthGuard } from '../identity/presentation/session-auth.guard'
import { AddPathItemDto } from './dto/add-path-item.dto'
import { CreateLearningPathDto } from './dto/create-learning-path.dto'
import { ListLearningPathsQueryDto } from './dto/list-learning-paths-query.dto'
import { ReorderPathItemsDto } from './dto/reorder-path-items.dto'
import { UpdateLearningPathDto } from './dto/update-learning-path.dto'
import { LearningPathsService } from './learning-paths.service'

@Controller('me/learning-paths')
@UseGuards(SessionAuthGuard)
export class LearningPathsController {
  constructor(
    @Inject(LearningPathsService)
    private readonly learningPaths: LearningPathsService,
  ) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query() query: ListLearningPathsQueryDto,
  ) {
    return this.learningPaths.list(userId, query.status ?? 'active')
  }

  @Get(':pathId')
  getById(
    @CurrentUserId() userId: string,
    @Param('pathId', ParseUUIDPipe) pathId: string,
  ) {
    return this.learningPaths.getById(userId, pathId)
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUserId() userId: string,
    @Body() dto: CreateLearningPathDto,
  ) {
    return this.learningPaths.create(userId, dto)
  }

  @Patch(':pathId')
  update(
    @CurrentUserId() userId: string,
    @Param('pathId', ParseUUIDPipe) pathId: string,
    @Body() dto: UpdateLearningPathDto,
  ) {
    return this.learningPaths.update(userId, pathId, dto)
  }

  @Delete(':pathId')
  @HttpCode(204)
  async remove(
    @CurrentUserId() userId: string,
    @Param('pathId', ParseUUIDPipe) pathId: string,
  ): Promise<void> {
    await this.learningPaths.remove(userId, pathId)
  }

  @Post(':pathId/items')
  @HttpCode(201)
  addItem(
    @CurrentUserId() userId: string,
    @Param('pathId', ParseUUIDPipe) pathId: string,
    @Body() dto: AddPathItemDto,
  ) {
    return this.learningPaths.addItem(userId, pathId, dto)
  }

  @Delete(':pathId/items/:itemId')
  @HttpCode(204)
  async removeItem(
    @CurrentUserId() userId: string,
    @Param('pathId', ParseUUIDPipe) pathId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.learningPaths.removeItem(userId, pathId, itemId)
  }

  @Put(':pathId/items/order')
  reorder(
    @CurrentUserId() userId: string,
    @Param('pathId', ParseUUIDPipe) pathId: string,
    @Body() dto: ReorderPathItemsDto,
  ) {
    return this.learningPaths.reorderItems(userId, pathId, dto)
  }
}
