import { AccountType, DEFAULT_ACCOUNT_NAME, DEFAULT_CATEGORIES } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Cria o usuário junto com as categorias padrão e a conta "Carteira",
   * tudo na mesma transação (escrita aninhada do Prisma).
   */
  createWithDefaults(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        categories: {
          createMany: {
            data: DEFAULT_CATEGORIES.map((category) => ({ ...category, isDefault: true })),
          },
        },
        accounts: {
          create: { name: DEFAULT_ACCOUNT_NAME, type: AccountType.WALLET },
        },
      },
    });
  }
}
