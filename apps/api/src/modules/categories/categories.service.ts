import type {
  Category as CategoryDto,
  CreateCategoryInput,
  ListCategoriesQuery,
  Paginated,
  UpdateCategoryInput,
} from '@contadim/contracts';
import { Injectable } from '@nestjs/common';

import { ConflictError, NotFoundError } from '../../common/errors/app-error.js';
import { paginate, toSkipTake } from '../../common/pagination/pagination.js';
import type { Category } from '../../generated/prisma/client.js';
import { CategoriesRepository } from './categories.repository.js';

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    color: category.color,
    icon: category.icon,
    isDefault: category.isDefault,
    archivedAt: category.archivedAt?.toISOString() ?? null,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

const DUPLICATE_NAME = 'Você já tem uma categoria com esse nome';

@Injectable()
export class CategoriesService {
  constructor(private readonly categories: CategoriesRepository) {}

  async list(userId: string, query: ListCategoriesQuery): Promise<Paginated<CategoryDto>> {
    const { items, total } = await this.categories.list(
      userId,
      { ...(query.type ? { type: query.type } : {}) },
      toSkipTake(query),
    );
    return paginate(items.map(toCategoryDto), total, query);
  }

  async get(userId: string, id: string): Promise<CategoryDto> {
    return toCategoryDto(await this.findOwned(userId, id));
  }

  async create(userId: string, input: CreateCategoryInput): Promise<CategoryDto> {
    if (await this.categories.findByName(userId, input.type, input.name)) {
      throw new ConflictError(DUPLICATE_NAME);
    }
    return toCategoryDto(await this.categories.create(userId, input));
  }

  async update(userId: string, id: string, input: UpdateCategoryInput): Promise<CategoryDto> {
    const category = await this.findOwned(userId, id);
    if (input.name !== undefined) {
      const sameName = await this.categories.findByName(userId, category.type, input.name);
      if (sameName && sameName.id !== id) throw new ConflictError(DUPLICATE_NAME);
    }
    return toCategoryDto(await this.categories.update(id, input));
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    if (await this.categories.hasTransactions(id)) {
      throw new ConflictError(
        'Esta categoria está em uso. Mude a categoria dos lançamentos antes de excluí-la',
      );
    }
    await this.categories.delete(id);
  }

  /** Garante que a categoria existe e pertence à pessoa (usado também por outros módulos). */
  async findOwned(userId: string, id: string): Promise<Category> {
    const category = await this.categories.findById(userId, id);
    if (!category) throw new NotFoundError('Categoria não encontrada');
    return category;
  }
}
