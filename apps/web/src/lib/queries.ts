import type { Paginated } from '@contadim/contracts';
import type { QueryClient } from '@tanstack/react-query';

import { api, type RequestOptions } from './api-client';

/** Chaves do React Query centralizadas, para invalidar de forma consistente. */
export const queryKeys = {
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  transactions: (filters: Record<string, string | undefined> = {}) =>
    ['transactions', filters] as const,
  summary: (month: string) => ['summary', month] as const,
  cards: ['cards'] as const,
  invoices: (cardId: string) => ['invoices', cardId] as const,
  invoice: (cardId: string, month: string) => ['invoices', cardId, month] as const,
  goals: ['goals'] as const,
  goalMovements: (goalId: string) => ['goals', goalId, 'movements'] as const,
};

const MAX_PAGES = 20;

/** Busca todas as páginas de uma listagem (contas, categorias e lançamentos de um mês). */
export async function fetchAll<T>(path: string, query: RequestOptions['query'] = {}): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await api<Paginated<T>>(path, { query: { ...query, page, pageSize: 100 } });
    items.push(...result.data);
    if (page >= result.meta.totalPages) break;
  }
  return items;
}

/** Depois de mexer em lançamentos, faturas ou metas, saldos, limites e resumos também mudam. */
export async function invalidateMoneyData(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['summary'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
    queryClient.invalidateQueries({ queryKey: queryKeys.cards }),
    queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
  ]);
}
