import {
  type CardPurchase,
  cardPurchaseSchema,
  type CreateCardPurchaseData,
  createCardPurchaseSchema,
  type UpdateCardPurchaseData,
  updateCardPurchaseSchema,
} from '@contadim/contracts';
import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type AuthUser, CurrentUser } from '../../common/auth/auth.decorators.js';
import { ApiErrorResponses, ApiZodBody, ApiZodResponse } from '../../common/openapi/zod-openapi.js';
import { IdParam, UuidParam, ZodBody } from '../../common/pipes/params.js';
import { CardPurchasesService } from './card-purchases.service.js';

@ApiTags('cards')
@ApiBearerAuth()
@ApiErrorResponses(401)
@Controller('cards/:id/purchases')
export class CardPurchasesController {
  constructor(private readonly purchases: CardPurchasesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Lança uma compra no cartão (à vista ou parcelada)',
    description:
      '`amount` é o valor total. A compra é dividida em parcelas (centavos que sobram vão na 1ª) ' +
      'e cada parcela vai para uma fatura. Compras a partir do dia do fechamento caem na fatura seguinte.',
  })
  @ApiZodBody(createCardPurchaseSchema)
  @ApiZodResponse(201, cardPurchaseSchema)
  @ApiErrorResponses(400, 404, 422)
  create(
    @CurrentUser() user: AuthUser,
    @IdParam() cardId: string,
    @ZodBody(createCardPurchaseSchema) body: CreateCardPurchaseData,
  ): Promise<CardPurchase> {
    return this.purchases.create(user.id, cardId, body);
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Detalha uma compra com todas as parcelas' })
  @ApiZodResponse(200, cardPurchaseSchema)
  @ApiErrorResponses(404)
  get(
    @CurrentUser() user: AuthUser,
    @IdParam() cardId: string,
    @UuidParam('groupId') groupId: string,
  ): Promise<CardPurchase> {
    return this.purchases.get(user.id, cardId, groupId);
  }

  @Patch(':groupId')
  @ApiOperation({
    summary: 'Atualiza categoria e descrição de todas as parcelas',
    description: 'Para mudar valor, data ou parcelas, exclua a compra e lance de novo.',
  })
  @ApiZodBody(updateCardPurchaseSchema)
  @ApiZodResponse(200, cardPurchaseSchema)
  @ApiErrorResponses(400, 404, 422)
  update(
    @CurrentUser() user: AuthUser,
    @IdParam() cardId: string,
    @UuidParam('groupId') groupId: string,
    @ZodBody(updateCardPurchaseSchema) body: UpdateCardPurchaseData,
  ): Promise<CardPurchase> {
    return this.purchases.update(user.id, cardId, groupId, body);
  }

  @Delete(':groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui a compra e todas as parcelas' })
  @ApiErrorResponses(404)
  async delete(
    @CurrentUser() user: AuthUser,
    @IdParam() cardId: string,
    @UuidParam('groupId') groupId: string,
  ): Promise<void> {
    await this.purchases.delete(user.id, cardId, groupId);
  }
}
