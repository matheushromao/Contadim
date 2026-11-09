import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class PrivacyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Todos os dados da pessoa, para exportação. */
  async findAllData(userId: string) {
    const [user, accounts, categories, transactions] = await this.prisma.$transaction([
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
    ]);
    return { user, accounts, categories, transactions };
  }

  /**
   * Apaga a pessoa e tudo o que é dela. Os lançamentos saem primeiro porque têm
   * FK `RESTRICT` para contas e categorias; o resto sai em cascata a partir do usuário.
   */
  async deleteUserAndData(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.transaction.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }
}
