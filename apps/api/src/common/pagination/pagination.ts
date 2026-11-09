import type { Paginated, PaginationQuery } from '@contadim/contracts';

/** Converte `page`/`pageSize` em `skip`/`take` para o Prisma. */
export function toSkipTake({ page, pageSize }: PaginationQuery): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/** Monta o envelope padrão `{ data, meta }` das listagens. */
export function paginate<T>(data: T[], total: number, query: PaginationQuery): Paginated<T> {
  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}
