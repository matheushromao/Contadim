import {
  type CreateTransactionData,
  createTransactionSchema,
  type ListTransactionsQuery,
  listTransactionsQuerySchema,
  type Paginated,
  type Transaction,
  transactionListSchema,
  transactionSchema,
  type UpdateTransactionData,
  updateTransactionSchema,
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
import { TransactionsService } from './transactions.service.js';

@ApiTags('transactions')
@ApiBearerAuth()
@ApiErrorResponses(401)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista lançamentos (mais recentes primeiro)',
    description: 'Filtre por `month` (AAAA-MM) ou pelo intervalo `from`/`to`.',
  })
  @ApiZodQuery(listTransactionsQuerySchema)
  @ApiZodResponse(200, transactionListSchema)
  @ApiErrorResponses(400)
  list(
    @CurrentUser() user: AuthUser,
    @ZodQuery(listTransactionsQuerySchema) query: ListTransactionsQuery,
  ): Promise<Paginated<Transaction>> {
    return this.transactions.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um lançamento' })
  @ApiZodResponse(200, transactionSchema)
  @ApiErrorResponses(404)
  get(@CurrentUser() user: AuthUser, @IdParam() id: string): Promise<Transaction> {
    return this.transactions.get(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria um lançamento (receita ou despesa)' })
  @ApiZodBody(createTransactionSchema)
  @ApiZodResponse(201, transactionSchema)
  @ApiErrorResponses(400, 404, 422)
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createTransactionSchema) body: CreateTransactionData,
  ): Promise<Transaction> {
    return this.transactions.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um lançamento' })
  @ApiZodBody(updateTransactionSchema)
  @ApiZodResponse(200, transactionSchema)
  @ApiErrorResponses(400, 404, 422)
  update(
    @CurrentUser() user: AuthUser,
    @IdParam() id: string,
    @ZodBody(updateTransactionSchema) body: UpdateTransactionData,
  ): Promise<Transaction> {
    return this.transactions.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui um lançamento' })
  @ApiErrorResponses(404)
  async delete(@CurrentUser() user: AuthUser, @IdParam() id: string): Promise<void> {
    await this.transactions.delete(user.id, id);
  }
}
