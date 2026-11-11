import type { UserDataExport } from '@contadim/contracts';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { ForbiddenError, NotFoundError } from '../../common/errors/app-error.js';
import { PasswordService } from '../auth/password.service.js';
import { toCategoryDto } from '../categories/categories.service.js';
import { toInvoicePaymentDto } from '../invoices/invoices.service.js';
import { toTransactionDto } from '../transactions/transactions.service.js';
import { toUserDto } from '../users/users.mapper.js';
import { UsersRepository } from '../users/users.repository.js';
import { PrivacyRepository } from './privacy.repository.js';

/** Direitos da LGPD: portabilidade (exportação) e eliminação dos dados. */
@Injectable()
export class PrivacyService {
  constructor(
    private readonly privacy: PrivacyRepository,
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PrivacyService.name);
  }

  async exportData(userId: string): Promise<UserDataExport> {
    const data = await this.privacy.findAllData(userId);
    if (!data.user) throw new NotFoundError('Conta não encontrada');

    return {
      exportedAt: new Date().toISOString(),
      version: 2,
      user: toUserDto(data.user),
      accounts: data.accounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        initialBalance: account.initialBalance,
        archivedAt: account.archivedAt?.toISOString() ?? null,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      })),
      categories: data.categories.map(toCategoryDto),
      transactions: data.transactions.map(toTransactionDto),
      creditCards: data.creditCards.map((card) => ({
        id: card.id,
        name: card.name,
        limit: card.limit,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        color: card.color,
        archivedAt: card.archivedAt?.toISOString() ?? null,
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
      })),
      invoicePayments: data.invoicePayments.map(toInvoicePaymentDto),
    };
  }

  /** Exclusão definitiva. Exige a senha atual como confirmação. */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('Conta não encontrada');

    // 403 (e não 401): a sessão é válida, só a confirmação falhou.
    if (!(await this.passwords.verify(user.passwordHash, password))) {
      throw new ForbiddenError('Senha incorreta');
    }

    await this.privacy.deleteUserAndData(userId);
    this.logger.info({ userId }, 'Conta excluída a pedido da pessoa');
  }
}
