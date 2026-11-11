import type {
  Account as AccountDto,
  CreateAccountInput,
  ListAccountsQuery,
  Paginated,
  UpdateAccountInput,
} from '@contadim/contracts';
import { computeAccountBalance } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import { ConflictError, NotFoundError } from '../../common/errors/app-error.js';
import { paginate, toSkipTake } from '../../common/pagination/pagination.js';
import type { Account } from '../../generated/prisma/client.js';
import {
  type AccountTotals,
  AccountsRepository,
  EMPTY_ACCOUNT_TOTALS,
} from './accounts.repository.js';

function toAccountDto(account: Account, totals: AccountTotals = EMPTY_ACCOUNT_TOTALS): AccountDto {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    initialBalance: account.initialBalance,
    currentBalance: computeAccountBalance({ initialBalance: account.initialBalance, ...totals }),
    archivedAt: account.archivedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

@Injectable()
export class AccountsService {
  constructor(private readonly accounts: AccountsRepository) {}

  async list(userId: string, query: ListAccountsQuery): Promise<Paginated<AccountDto>> {
    const { items, total } = await this.accounts.list(userId, toSkipTake(query));
    const totals = await this.accounts.totalsByAccount(
      userId,
      items.map((account) => account.id),
    );
    return paginate(
      items.map((account) => toAccountDto(account, totals.get(account.id))),
      total,
      query,
    );
  }

  async get(userId: string, id: string): Promise<AccountDto> {
    return this.withBalance(userId, await this.findOwned(userId, id));
  }

  async create(userId: string, input: CreateAccountInput): Promise<AccountDto> {
    return toAccountDto(await this.accounts.create(userId, input));
  }

  async update(userId: string, id: string, input: UpdateAccountInput): Promise<AccountDto> {
    await this.findOwned(userId, id);
    return this.withBalance(userId, await this.accounts.update(id, input));
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    if (await this.accounts.isInUse(id)) {
      throw new ConflictError(
        'Esta conta tem lançamentos, pagamentos de fatura ou movimentações de metas. Remova-os antes de excluí-la',
      );
    }
    await this.accounts.delete(id);
  }

  /** Garante que a conta existe e pertence à pessoa (usado também por outros módulos). */
  async findOwned(userId: string, id: string): Promise<Account> {
    const account = await this.accounts.findById(userId, id);
    if (!account) throw new NotFoundError('Conta não encontrada');
    return account;
  }

  private async withBalance(userId: string, account: Account): Promise<AccountDto> {
    const totals = await this.accounts.totalsByAccount(userId, [account.id]);
    return toAccountDto(account, totals.get(account.id));
  }
}
