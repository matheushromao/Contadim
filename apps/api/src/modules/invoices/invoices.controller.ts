import {
  type CreateInvoicePaymentInput,
  createInvoicePaymentSchema,
  type InvoiceDetail,
  invoiceDetailSchema,
  invoiceListSchema,
  type InvoiceSummary,
  type ListInvoicesQuery,
  listInvoicesQuerySchema,
} from '@contadim/contracts';
import { Controller, Delete, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type AuthUser, CurrentUser } from '../../common/auth/auth.decorators.js';
import {
  ApiErrorResponses,
  ApiZodBody,
  ApiZodQuery,
  ApiZodResponse,
} from '../../common/openapi/zod-openapi.js';
import { IdParam, MonthParam, UuidParam, ZodBody, ZodQuery } from '../../common/pipes/params.js';
import { InvoicesService } from './invoices.service.js';

@ApiTags('cards')
@ApiBearerAuth()
@ApiErrorResponses(401, 404)
/** `:month` = mês de vencimento da fatura (`YYYY-MM`). */
@Controller('cards/:id/invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as faturas do cartão',
    description:
      'Padrão: 3 meses antes e 12 depois da fatura atual. Identificadas pelo mês de vencimento.',
  })
  @ApiZodQuery(listInvoicesQuerySchema)
  @ApiZodResponse(200, invoiceListSchema)
  @ApiErrorResponses(400)
  async list(
    @CurrentUser() user: AuthUser,
    @IdParam() cardId: string,
    @ZodQuery(listInvoicesQuerySchema) query: ListInvoicesQuery,
  ): Promise<{ data: InvoiceSummary[] }> {
    return { data: await this.invoices.list(user.id, cardId, query) };
  }

  @Get(':month')
  @ApiOperation({ summary: 'Detalha uma fatura: parcelas cobradas e pagamentos' })
  @ApiZodResponse(200, invoiceDetailSchema)
  @ApiErrorResponses(400)
  get(
    @CurrentUser() user: AuthUser,
    @IdParam() cardId: string,
    @MonthParam() month: string,
  ): Promise<InvoiceDetail> {
    return this.invoices.get(user.id, cardId, month);
  }

  @Post(':month/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Paga a fatura (total ou parcial) a partir de uma conta',
    description:
      'O pagamento reduz o saldo da conta, mas não conta como despesa no resumo. ' +
      'Não há rotativo: o que faltar continua nesta fatura.',
  })
  @ApiZodBody(createInvoicePaymentSchema)
  @ApiZodResponse(201, invoiceDetailSchema)
  @ApiErrorResponses(400, 422)
  pay(
    @CurrentUser() user: AuthUser,
    @IdParam() cardId: string,
    @MonthParam() month: string,
    @ZodBody(createInvoicePaymentSchema) body: CreateInvoicePaymentInput,
  ): Promise<InvoiceDetail> {
    return this.invoices.pay(user.id, cardId, month, body);
  }

  @Delete(':month/payments/:paymentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desfaz um pagamento de fatura' })
  @ApiErrorResponses(400)
  async deletePayment(
    @CurrentUser() user: AuthUser,
    @IdParam() cardId: string,
    @MonthParam() month: string,
    @UuidParam('paymentId') paymentId: string,
  ): Promise<void> {
    await this.invoices.deletePayment(user.id, cardId, month, paymentId);
  }
}
