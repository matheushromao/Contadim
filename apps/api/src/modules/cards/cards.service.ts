import type {
  CreateCreditCardInput,
  CreditCard as CreditCardDto,
  ListCreditCardsQuery,
  Paginated,
  UpdateCreditCardInput,
} from '@contadim/contracts';
import { availableLimit, invoiceMonthFor, outstandingAmount } from '@contadim/core';
import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '../../common/clock/clock.js';
import { ConflictError, NotFoundError } from '../../common/errors/app-error.js';
import { paginate, toSkipTake } from '../../common/pagination/pagination.js';
import type { CreditCard } from '../../generated/prisma/client.js';
import { CardsRepository, type InvoiceTotals } from './cards.repository.js';
import { buildInvoiceSummary } from './invoice-summary.js';

@Injectable()
export class CardsService {
  constructor(
    private readonly cards: CardsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(userId: string, query: ListCreditCardsQuery): Promise<Paginated<CreditCardDto>> {
    const { items, total } = await this.cards.list(userId, toSkipTake(query));
    const totals = await this.cards.invoiceTotals(
      userId,
      items.map((card) => card.id),
    );
    return paginate(
      items.map((card) => this.toDto(card, totals.get(card.id))),
      total,
      query,
    );
  }

  async get(userId: string, id: string): Promise<CreditCardDto> {
    return this.withTotals(userId, await this.findOwned(userId, id));
  }

  async create(userId: string, input: CreateCreditCardInput): Promise<CreditCardDto> {
    return this.toDto(await this.cards.create(userId, input), undefined);
  }

  async update(userId: string, id: string, input: UpdateCreditCardInput): Promise<CreditCardDto> {
    await this.findOwned(userId, id);
    return this.withTotals(userId, await this.cards.update(id, input));
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    if (await this.cards.hasPurchases(id)) {
      throw new ConflictError(
        'Este cartão tem compras lançadas. Exclua as compras antes de excluir o cartão',
      );
    }
    await this.cards.delete(id);
  }

  /** Garante que o cartão existe e pertence à pessoa (usado também por outros módulos). */
  async findOwned(userId: string, id: string): Promise<CreditCard> {
    const card = await this.cards.findById(userId, id);
    if (!card) throw new NotFoundError('Cartão não encontrado');
    return card;
  }

  private async withTotals(userId: string, card: CreditCard): Promise<CreditCardDto> {
    const totals = await this.cards.invoiceTotals(userId, [card.id]);
    return this.toDto(card, totals.get(card.id));
  }

  private toDto(card: CreditCard, invoices: Map<string, InvoiceTotals> | undefined): CreditCardDto {
    const today = this.clock.today();
    const cycle = { closingDay: card.closingDay, dueDay: card.dueDay };
    const currentMonth = invoiceMonthFor(today, cycle);
    const outstanding = outstandingAmount([...(invoices?.values() ?? [])]);

    return {
      id: card.id,
      name: card.name,
      limit: card.limit,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      color: card.color,
      availableLimit: availableLimit(card.limit, outstanding),
      currentInvoice: buildInvoiceSummary({
        cardId: card.id,
        cycle,
        month: currentMonth,
        totals: invoices?.get(currentMonth),
        today,
      }),
      archivedAt: card.archivedAt?.toISOString() ?? null,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  }
}
