import { randomUUID } from 'node:crypto';

import type {
  CardPurchase,
  CreateCardPurchaseData,
  UpdateCardPurchaseData,
} from '@contadim/contracts';
import { installmentSchedule, sumCents } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import { NotFoundError, UnprocessableError } from '../../common/errors/app-error.js';
import type { Transaction } from '../../generated/prisma/client.js';
import { fromDbDate } from '../../infra/prisma/calendar-date.js';
import { CardsService } from '../cards/cards.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { toTransactionDto } from '../transactions/transactions.service.js';
import { CardPurchasesRepository } from './card-purchases.repository.js';

function toPurchaseDto(rows: Transaction[]): CardPurchase {
  const first = rows[0]!;
  return {
    groupId: first.installmentGroupId!,
    cardId: first.cardId!,
    categoryId: first.categoryId,
    description: first.description,
    date: fromDbDate(first.date),
    totalAmount: sumCents(rows.map((row) => row.amount)),
    installmentTotal: first.installmentTotal!,
    installments: rows.map(toTransactionDto),
  };
}

/** Compras no cartão: cada compra é um grupo de parcelas, tratado como uma unidade. */
@Injectable()
export class CardPurchasesService {
  constructor(
    private readonly purchases: CardPurchasesRepository,
    private readonly cards: CardsService,
    private readonly categories: CategoriesService,
  ) {}

  async create(
    userId: string,
    cardId: string,
    input: CreateCardPurchaseData,
  ): Promise<CardPurchase> {
    const card = await this.cards.findOwned(userId, cardId);
    await this.assertExpenseCategory(userId, input.categoryId);

    const schedule = installmentSchedule({
      purchaseDate: input.date,
      totalCents: input.amount,
      installments: input.installments,
      cycle: { closingDay: card.closingDay, dueDay: card.dueDay },
    });
    const rows = await this.purchases.create({
      userId,
      cardId,
      groupId: randomUUID(),
      categoryId: input.categoryId,
      description: input.description ?? null,
      date: input.date,
      schedule,
    });
    return toPurchaseDto(rows.sort((a, b) => a.installmentNumber! - b.installmentNumber!));
  }

  async get(userId: string, cardId: string, groupId: string): Promise<CardPurchase> {
    return toPurchaseDto(await this.findGroup(userId, cardId, groupId));
  }

  async update(
    userId: string,
    cardId: string,
    groupId: string,
    input: UpdateCardPurchaseData,
  ): Promise<CardPurchase> {
    await this.findGroup(userId, cardId, groupId);
    if (input.categoryId) await this.assertExpenseCategory(userId, input.categoryId);
    await this.purchases.updateGroup(groupId, {
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.description !== undefined && { description: input.description }),
    });
    return this.get(userId, cardId, groupId);
  }

  async delete(userId: string, cardId: string, groupId: string): Promise<void> {
    await this.findGroup(userId, cardId, groupId);
    await this.purchases.deleteGroup(groupId);
  }

  private async findGroup(userId: string, cardId: string, groupId: string): Promise<Transaction[]> {
    await this.cards.findOwned(userId, cardId);
    const rows = await this.purchases.findGroup(userId, cardId, groupId);
    if (rows.length === 0) throw new NotFoundError('Compra não encontrada');
    return rows;
  }

  private async assertExpenseCategory(userId: string, categoryId: string): Promise<void> {
    const category = await this.categories.findOwned(userId, categoryId);
    if (category.type !== 'EXPENSE') {
      throw new UnprocessableError('Compras no cartão precisam de uma categoria de despesa', [
        { path: 'categoryId', message: 'Escolha uma categoria de despesa' },
      ]);
    }
  }
}
