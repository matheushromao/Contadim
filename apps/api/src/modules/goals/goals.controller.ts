import {
  type CreateGoalData,
  type CreateGoalMovementData,
  createGoalMovementSchema,
  createGoalSchema,
  type Goal,
  goalListSchema,
  type GoalMovement,
  goalMovementListSchema,
  goalSchema,
  type ListGoalMovementsQuery,
  listGoalMovementsQuerySchema,
  type ListGoalsQuery,
  listGoalsQuerySchema,
  type Paginated,
  type UpdateGoalData,
  updateGoalSchema,
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
import { IdParam, UuidParam, ZodBody, ZodQuery } from '../../common/pipes/params.js';
import { GoalsService } from './goals.service.js';

@ApiTags('goals')
@ApiBearerAuth()
@ApiErrorResponses(401)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as metas, com progresso e quanto guardar por mês' })
  @ApiZodQuery(listGoalsQuerySchema)
  @ApiZodResponse(200, goalListSchema)
  list(
    @CurrentUser() user: AuthUser,
    @ZodQuery(listGoalsQuerySchema) query: ListGoalsQuery,
  ): Promise<Paginated<Goal>> {
    return this.goals.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma meta' })
  @ApiZodResponse(200, goalSchema)
  @ApiErrorResponses(404)
  get(@CurrentUser() user: AuthUser, @IdParam() id: string): Promise<Goal> {
    return this.goals.get(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma meta (prazo opcional)' })
  @ApiZodBody(createGoalSchema)
  @ApiZodResponse(201, goalSchema)
  @ApiErrorResponses(400)
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createGoalSchema) body: CreateGoalData,
  ): Promise<Goal> {
    return this.goals.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma meta (o plano mensal é recalculado)' })
  @ApiZodBody(updateGoalSchema)
  @ApiZodResponse(200, goalSchema)
  @ApiErrorResponses(400, 404)
  update(
    @CurrentUser() user: AuthUser,
    @IdParam() id: string,
    @ZodBody(updateGoalSchema) body: UpdateGoalData,
  ): Promise<Goal> {
    return this.goals.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui uma meta sem dinheiro guardado' })
  @ApiErrorResponses(404, 409)
  async delete(@CurrentUser() user: AuthUser, @IdParam() id: string): Promise<void> {
    await this.goals.delete(user.id, id);
  }

  @Get(':id/movements')
  @ApiOperation({ summary: 'Histórico de depósitos e resgates (mais recentes primeiro)' })
  @ApiZodQuery(listGoalMovementsQuerySchema)
  @ApiZodResponse(200, goalMovementListSchema)
  @ApiErrorResponses(404)
  listMovements(
    @CurrentUser() user: AuthUser,
    @IdParam() id: string,
    @ZodQuery(listGoalMovementsQuerySchema) query: ListGoalMovementsQuery,
  ): Promise<Paginated<GoalMovement>> {
    return this.goals.listMovements(user.id, id, query);
  }

  @Post(':id/movements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Guarda ou resgata dinheiro da meta',
    description:
      'O depósito sai de uma conta e o resgate volta para uma conta. Nenhum dos dois é ' +
      'receita ou despesa no resumo. O resgate não pode passar do que está guardado.',
  })
  @ApiZodBody(createGoalMovementSchema)
  @ApiZodResponse(201, goalSchema)
  @ApiErrorResponses(400, 404, 422)
  addMovement(
    @CurrentUser() user: AuthUser,
    @IdParam() id: string,
    @ZodBody(createGoalMovementSchema) body: CreateGoalMovementData,
  ): Promise<Goal> {
    return this.goals.addMovement(user.id, id, body);
  }

  @Delete(':id/movements/:movementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desfaz um depósito ou resgate' })
  @ApiErrorResponses(404, 422)
  async deleteMovement(
    @CurrentUser() user: AuthUser,
    @IdParam() id: string,
    @UuidParam('movementId') movementId: string,
  ): Promise<void> {
    await this.goals.deleteMovement(user.id, id, movementId);
  }
}
