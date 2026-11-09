import {
  type Category,
  categoryListSchema,
  categorySchema,
  type CreateCategoryInput,
  createCategorySchema,
  type ListCategoriesQuery,
  listCategoriesQuerySchema,
  type Paginated,
  type UpdateCategoryInput,
  updateCategorySchema,
} from '@contadim/contracts';
import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type AuthUser, CurrentUser } from '../../common/auth/auth.decorators.js';
import {
  ApiErrorResponses,
  ApiZodBody,
  ApiZodQuery,
  ApiZodResponse,
} from '../../common/openapi/zod-openapi.js';
import { IdParam, ZodBody, ZodQuery } from '../../common/pipes/params.js';
import { CategoriesService } from './categories.service.js';

@ApiTags('categories')
@ApiBearerAuth()
@ApiErrorResponses(401)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as categorias (filtro opcional por tipo)' })
  @ApiZodQuery(listCategoriesQuerySchema)
  @ApiZodResponse(200, categoryListSchema)
  list(
    @CurrentUser() user: AuthUser,
    @ZodQuery(listCategoriesQuerySchema) query: ListCategoriesQuery,
  ): Promise<Paginated<Category>> {
    return this.categories.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma categoria' })
  @ApiZodResponse(200, categorySchema)
  @ApiErrorResponses(404)
  get(@CurrentUser() user: AuthUser, @IdParam() id: string): Promise<Category> {
    return this.categories.get(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma categoria' })
  @ApiZodBody(createCategorySchema)
  @ApiZodResponse(201, categorySchema)
  @ApiErrorResponses(400, 409)
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createCategorySchema) body: CreateCategoryInput,
  ): Promise<Category> {
    return this.categories.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza nome, cor ou ícone (o tipo não muda)' })
  @ApiZodBody(updateCategorySchema)
  @ApiZodResponse(200, categorySchema)
  @ApiErrorResponses(400, 404, 409)
  update(
    @CurrentUser() user: AuthUser,
    @IdParam() id: string,
    @ZodBody(updateCategorySchema) body: UpdateCategoryInput,
  ): Promise<Category> {
    return this.categories.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui uma categoria que não está em uso' })
  @ApiErrorResponses(404, 409)
  async delete(@CurrentUser() user: AuthUser, @IdParam() id: string): Promise<void> {
    await this.categories.delete(user.id, id);
  }
}
