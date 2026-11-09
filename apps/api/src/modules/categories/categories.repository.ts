import type { CreateCategoryInput, UpdateCategoryInput } from '@contadim/contracts';
import type { EntryType } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import type { Category } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

/** Acesso a dados de categorias. Toda consulta é filtrada pelo `userId`. */
@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, filter: { type?: EntryType }, page: { skip: number; take: number }) {
    const where = { userId, ...(filter.type ? { type: filter.type } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        ...page,
      }),
      this.prisma.category.count({ where }),
    ]);
    return { items, total };
  }

  findById(userId: string, id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({ where: { id, userId } });
  }

  findByName(userId: string, type: EntryType, name: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { userId, type, name: { equals: name, mode: 'insensitive' } },
    });
  }

  create(userId: string, data: CreateCategoryInput): Promise<Category> {
    return this.prisma.category.create({ data: { ...data, userId } });
  }

  update(id: string, data: UpdateCategoryInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }

  async hasTransactions(id: string): Promise<boolean> {
    return (await this.prisma.transaction.count({ where: { categoryId: id }, take: 1 })) > 0;
  }
}
