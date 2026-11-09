import type { Account, Category, Paginated } from '@contadim/contracts';
import { vi } from 'vitest';

import type { RequestOptions } from '../lib/api-client';

export const accounts: Account[] = [
  {
    id: '00000000-0000-4000-8000-0000000000a1',
    name: 'Carteira',
    type: 'WALLET',
    initialBalance: 0,
    currentBalance: 10000,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-0000000000a2',
    name: 'Nubank',
    type: 'CHECKING',
    initialBalance: 0,
    currentBalance: 50000,
    archivedAt: null,
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
];

const category = (id: string, name: string, type: Category['type'], icon: string): Category => ({
  id,
  name,
  type,
  icon,
  color: '#F97316',
  isDefault: true,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

export const categories: Category[] = [
  category('00000000-0000-4000-8000-0000000000c1', 'Alimentação', 'EXPENSE', 'utensils'),
  category('00000000-0000-4000-8000-0000000000c2', 'Moradia', 'EXPENSE', 'house'),
  category('00000000-0000-4000-8000-0000000000c3', 'Salário', 'INCOME', 'wallet'),
];

export const page = <T>(data: T[]): Paginated<T> => ({
  data,
  meta: { page: 1, pageSize: 100, total: data.length, totalPages: 1 },
});

type Handler = (options: RequestOptions) => unknown;

/** Cria um `api()` falso que responde por "MÉTODO /caminho". */
export function fakeApi(handlers: Record<string, Handler>) {
  return vi.fn((path: string, options: RequestOptions = {}) => {
    const key = `${options.method ?? 'GET'} ${path}`;
    const handler = handlers[key];
    if (!handler) return Promise.reject(new Error(`Sem handler para ${key}`));
    return Promise.resolve(handler(options));
  });
}
