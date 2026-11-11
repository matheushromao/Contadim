import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class PrivacyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Todos os dados da pessoa, para exportação. */
  async findAllData(userId: string) {
    const [user, accounts, categories, transactions, creditCards, invoicePayments] =
      await this.prisma.$transaction([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.account.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.category.findMany({
          where: { userId },
          orderBy: [{ type: 'asc' }, { name: 'asc' }],
        }),
        this.prisma.transaction.findMany({
          where: { userId },
          orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.creditCard.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.invoicePayment.findMany({
          where: { userId },
          orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
        }),
      ]);
    return { user, accounts, categories, transactions, creditCards, invoicePayments };
  }

  /**
   * Apaga a pessoa e tudo o que é dela. Movimentações de metas, pagamentos e lançamentos saem
   * primeiro porque têm FK `RESTRICT` para contas, cartões e categorias; o resto sai em
   * cascata a partir do usuário.
   */
  async deleteUserAndData(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.goalMovement.deleteMany({ where: { userId } }),
      this.prisma.invoicePayment.deleteMany({ where: { userId } }),
      this.prisma.transaction.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }
}
