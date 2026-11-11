import type {
  CreateInvoicePaymentInput,
  InvoiceDetail,
  InvoicePayment as InvoicePaymentDto,
  InvoiceSummary,
  ListInvoicesQuery,
} from '@contadim/contracts';
import { formatBRL, invoiceMonthFor, shiftMonth, type YearMonth } from '@contadim/core';
import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '../../common/clock/clock.js';
import { NotFoundError, UnprocessableError } from '../../common/errors/app-error.js';
import type { CreditCard, InvoicePayment } from '../../generated/prisma/client.js';
import { fromDbDate } from '../../infra/prisma/calendar-date.js';
import { AccountsService } from '../accounts/accounts.service.js';
import { CardsRepository } from '../cards/cards.repository.js';
import { CardsService } from '../cards/cards.service.js';
import { buildInvoiceSummary } from '../cards/invoice-summary.js';
import { toTransactionDto } from '../transactions/transactions.service.js';
import { InvoicesRepository } from './invoices.repository.js';

/** Quantos meses a listagem mostra por padrão, em volta da fatura atual. */
const DEFAULT_PAST_MONTHS = 3;
const DEFAULT_FUTURE_MONTHS = 12;

export function toInvoicePaymentDto(payment: InvoicePayment): InvoicePaymentDto {
  return {
    id: payment.id,
    cardId: payment.cardId,
    invoiceMonth: fromDbDate(payment.invoiceMonth).slice(0, 7),
    accountId: payment.accountId,
    amount: payment.amount,
    date: fromDbDate(payment.date),
    createdAt: payment.createdAt.toISOString(),
  };
}

function monthsBetween(from: YearMonth, to: YearMonth): YearMonth[] {
  const months: YearMonth[] = [];
  for (let month = from; month <= to; month = shiftMonth(month, 1)) months.push(month);
  return months;
}

/** Faturas do cartão e pagamentos (total ou parcial, sem rotativo). */
@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoices: InvoicesRepository,
    private readonly cards: CardsService,
    private readonly cardsRepository: CardsRepository,
    private readonly accounts: AccountsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(userId: string, cardId: string, query: ListInvoicesQuery): Promise<InvoiceSummary[]> {
    const card = await this.cards.findOwned(userId, cardId);
    const current = invoiceMonthFor(this.clock.today(), this.cycleOf(card));
    const from = query.from ?? shiftMonth(current, -DEFAULT_PAST_MONTHS);
    const to = query.to ?? shiftMonth(current, DEFAULT_FUTURE_MONTHS);
    const totals = (await this.cardsRepository.invoiceTotals(userId, [cardId])).get(cardId);

    return monthsBetween(from, to).map((month) => this.summary(card, month, totals?.get(month)));
  }

  async get(userId: string, cardId: string, month: YearMonth): Promise<InvoiceDetail> {
    const card = await this.cards.findOwned(userId, cardId);
    const [charges, payments] = await Promise.all([
      this.invoices.charges(userId, cardId, month),
      this.invoices.payments(userId, cardId, month),
    ]);
    const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      ...this.summary(card, month, { total, paid }),
      transactions: charges.map(toTransactionDto),
      payments: payments.map(toInvoicePaymentDto),
    };
  }

  /** Registra um pagamento saindo de uma conta. Não pode passar do que falta pagar. */
  async pay(
    userId: string,
    cardId: string,
    month: YearMonth,
    input: CreateInvoicePaymentInput,
  ): Promise<InvoiceDetail> {
    await this.accounts.findOwned(userId, input.accountId);
    const invoice = await this.get(userId, cardId, month);

    if (invoice.remaining === 0) {
      throw new UnprocessableError('Esta fatura não tem valor em aberto');
    }
    if (input.amount > invoice.remaining) {
      throw new UnprocessableError(
        `O valor passa do que falta pagar (${formatBRL(invoice.remaining)})`,
        [{ path: 'amount', message: `No máximo ${formatBRL(invoice.remaining)}` }],
      );
    }

    await this.invoices.createPayment({ userId, cardId, invoiceMonth: month, ...input });
    return this.get(userId, cardId, month);
  }

  async deletePayment(
    userId: string,
    cardId: string,
    month: YearMonth,
    paymentId: string,
  ): Promise<void> {
    await this.cards.findOwned(userId, cardId);
    const payment = await this.invoices.findPayment(userId, cardId, month, paymentId);
    if (!payment) throw new NotFoundError('Pagamento não encontrado');
    await this.invoices.deletePayment(payment.id);
  }

  private summary(
    card: CreditCard,
    month: YearMonth,
    totals: { total: number; paid: number } | undefined,
  ): InvoiceSummary {
    return buildInvoiceSummary({
      cardId: card.id,
      cycle: this.cycleOf(card),
      month,
      totals,
      today: this.clock.today(),
    });
  }

  private cycleOf(card: CreditCard) {
    return { closingDay: card.closingDay, dueDay: card.dueDay };
  }
}
