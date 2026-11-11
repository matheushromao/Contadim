import type {
  CreateTransactionData,
  ListTransactionsQuery,
  Paginated,
  Transaction as TransactionDto,
  UpdateTransactionData,
} from '@contadim/contracts';
import { Injectable } from '@nestjs/common';

import { NotFoundError, UnprocessableError } from '../../common/errors/app-error.js';
import { paginate, toSkipTake } from '../../common/pagination/pagination.js';
import type { Transaction } from '../../generated/prisma/client.js';
import { fromDbDate } from '../../infra/prisma/calendar-date.js';
import { AccountsService } from '../accounts/accounts.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import {
  type TransactionData,
  type TransactionFilter,
  TransactionsRepository,
} from './transactions.repository.js';

export function toTransactionDto(transaction: Transaction): TransactionDto {
  return {
    id: transaction.id,
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.type,
    date: fromDbDate(transaction.date),
    categoryId: transaction.categoryId,
    accountId: transaction.accountId,
    cardId: transaction.cardId,
    invoiceMonth: transaction.invoiceMonth
      ? fromDbDate(transaction.invoiceMonth).slice(0, 7)
      : null,
    installmentGroupId: transaction.installmentGroupId,
    installmentNumber: transaction.installmentNumber,
    installmentTotal: transaction.installmentTotal,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

/** Parcelas de cartão são editadas como uma compra só, pela fatura do cartão. */
function assertNotCardCharge(transaction: Transaction): asserts transaction is Transaction & {
  accountId: string;
} {
  if (!transaction.accountId) {
    throw new UnprocessableError(
      'Este lançamento é uma compra no cartão. Edite pela fatura do cartão',
    );
  }
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactions: TransactionsRepository,
    private readonly categories: CategoriesService,
    private readonly accounts: AccountsService,
  ) {}

  async list(userId: string, query: ListTransactionsQuery): Promise<Paginated<TransactionDto>> {
    const filter: TransactionFilter = {
      ...(query.month && { month: query.month }),
      ...(query.from && { from: query.from }),
      ...(query.to && { to: query.to }),
      ...(query.type && { type: query.type }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.accountId && { accountId: query.accountId }),
      ...(query.cardId && { cardId: query.cardId }),
    };
    const { items, total } = await this.transactions.list(userId, filter, toSkipTake(query));
    return paginate(items.map(toTransactionDto), total, query);
  }

  async get(userId: string, id: string): Promise<TransactionDto> {
    return toTransactionDto(await this.findOwned(userId, id));
  }

  async create(userId: string, input: CreateTransactionData): Promise<TransactionDto> {
    const data: TransactionData = { ...input, description: input.description ?? null };
    await this.assertConsistent(userId, data);
    return toTransactionDto(await this.transactions.create(userId, data));
  }

  async update(userId: string, id: string, input: UpdateTransactionData): Promise<TransactionDto> {
    const current = await this.findOwned(userId, id);
    assertNotCardCharge(current);

    const data: TransactionData = {
      amount: input.amount ?? current.amount,
      type: input.type ?? current.type,
      date: input.date ?? fromDbDate(current.date),
      categoryId: input.categoryId ?? current.categoryId,
      accountId: input.accountId ?? current.accountId,
      description: input.description === undefined ? current.description : input.description,
    };
    await this.assertConsistent(userId, data);
    return toTransactionDto(await this.transactions.update(id, data));
  }

  async delete(userId: string, id: string): Promise<void> {
    assertNotCardCharge(await this.findOwned(userId, id));
    await this.transactions.delete(id);
  }

  /** Conta e categoria precisam ser da pessoa, e o tipo do lançamento deve bater com o da categoria. */
  private async assertConsistent(userId: string, data: TransactionData): Promise<void> {
    const [category] = await Promise.all([
      this.categories.findOwned(userId, data.categoryId),
      this.accounts.findOwned(userId, data.accountId),
    ]);
    if (category.type !== data.type) {
      throw new UnprocessableError(
        data.type === 'EXPENSE'
          ? 'Escolha uma categoria de despesa para este lançamento'
          : 'Escolha uma categoria de receita para este lançamento',
        [{ path: 'categoryId', message: 'Tipo da categoria diferente do lançamento' }],
      );
    }
  }

  private async findOwned(userId: string, id: string): Promise<Transaction> {
    const transaction = await this.transactions.findById(userId, id);
    if (!transaction) throw new NotFoundError('Lançamento não encontrado');
    return transaction;
  }
}
