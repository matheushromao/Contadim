import {
  type Account,
  accountListSchema,
  accountSchema,
  type CreateAccountInput,
  createAccountSchema,
  type ListAccountsQuery,
  listAccountsQuerySchema,
  type Paginated,
  type UpdateAccountInput,
  updateAccountSchema,
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
import { AccountsService } from './accounts.service.js';

@ApiTags('accounts')
@ApiBearerAuth()
@ApiErrorResponses(401)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as contas, com saldo atual' })
  @ApiZodQuery(listAccountsQuerySchema)
  @ApiZodResponse(200, accountListSchema)
  list(
    @CurrentUser() user: AuthUser,
    @ZodQuery(listAccountsQuerySchema) query: ListAccountsQuery,
  ): Promise<Paginated<Account>> {
    return this.accounts.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma conta' })
  @ApiZodResponse(200, accountSchema)
  @ApiErrorResponses(404)
  get(@CurrentUser() user: AuthUser, @IdParam() id: string): Promise<Account> {
    return this.accounts.get(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma conta' })
  @ApiZodBody(createAccountSchema)
  @ApiZodResponse(201, accountSchema)
  @ApiErrorResponses(400)
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createAccountSchema) body: CreateAccountInput,
  ): Promise<Account> {
    return this.accounts.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma conta' })
  @ApiZodBody(updateAccountSchema)
  @ApiZodResponse(200, accountSchema)
  @ApiErrorResponses(400, 404)
  update(
    @CurrentUser() user: AuthUser,
    @IdParam() id: string,
    @ZodBody(updateAccountSchema) body: UpdateAccountInput,
  ): Promise<Account> {
    return this.accounts.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui uma conta sem lançamentos' })
  @ApiErrorResponses(404, 409)
  async delete(@CurrentUser() user: AuthUser, @IdParam() id: string): Promise<void> {
    await this.accounts.delete(user.id, id);
  }
}
