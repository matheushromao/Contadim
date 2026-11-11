import {
  type CreateCreditCardInput,
  createCreditCardSchema,
  type CreditCard,
  creditCardListSchema,
  creditCardSchema,
  type ListCreditCardsQuery,
  listCreditCardsQuerySchema,
  type Paginated,
  type UpdateCreditCardInput,
  updateCreditCardSchema,
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
import { CardsService } from './cards.service.js';

@ApiTags('cards')
@ApiBearerAuth()
@ApiErrorResponses(401)
@Controller('cards')
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os cartões, com limite disponível e fatura atual' })
  @ApiZodQuery(listCreditCardsQuerySchema)
  @ApiZodResponse(200, creditCardListSchema)
  list(
    @CurrentUser() user: AuthUser,
    @ZodQuery(listCreditCardsQuerySchema) query: ListCreditCardsQuery,
  ): Promise<Paginated<CreditCard>> {
    return this.cards.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um cartão' })
  @ApiZodResponse(200, creditCardSchema)
  @ApiErrorResponses(404)
  get(@CurrentUser() user: AuthUser, @IdParam() id: string): Promise<CreditCard> {
    return this.cards.get(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra um cartão de crédito' })
  @ApiZodBody(createCreditCardSchema)
  @ApiZodResponse(201, creditCardSchema)
  @ApiErrorResponses(400)
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createCreditCardSchema) body: CreateCreditCardInput,
  ): Promise<CreditCard> {
    return this.cards.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza um cartão',
    description: 'Mudar fechamento ou vencimento vale só para compras novas.',
  })
  @ApiZodBody(updateCreditCardSchema)
  @ApiZodResponse(200, creditCardSchema)
  @ApiErrorResponses(400, 404)
  update(
    @CurrentUser() user: AuthUser,
    @IdParam() id: string,
    @ZodBody(updateCreditCardSchema) body: UpdateCreditCardInput,
  ): Promise<CreditCard> {
    return this.cards.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui um cartão sem compras' })
  @ApiErrorResponses(404, 409)
  async delete(@CurrentUser() user: AuthUser, @IdParam() id: string): Promise<void> {
    await this.cards.delete(user.id, id);
  }
}
