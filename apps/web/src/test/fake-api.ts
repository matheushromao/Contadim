import type {
  Account,
  Category,
  CreditCard,
  Goal,
  InvoiceDetail,
  Paginated,
} from '@contadim/contracts';
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
    try {
      return Promise.resolve(handler(options));
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export const CARD_ID = '00000000-0000-4000-8000-0000000000d1';

export const card: CreditCard = {
  id: CARD_ID,
  name: 'Nubank',
  limit: 500000,
  closingDay: 3,
  dueDay: 10,
  color: '#8B5CF6',
  availableLimit: 380000,
  currentInvoice: {
    cardId: CARD_ID,
    month: '2026-12',
    periodStart: '2026-11-03',
    periodEnd: '2026-12-02',
    closingDate: '2026-12-03',
    dueDate: '2026-12-10',
    total: 12000,
    paid: 0,
    remaining: 12000,
    status: 'OPEN',
  },
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

/** Fatura de um mês com uma parcela 2/3 e o total informado. */
export function invoiceDetail(
  month: string,
  overrides: Partial<InvoiceDetail> = {},
): InvoiceDetail {
  return {
    ...card.currentInvoice,
    month,
    status: 'CLOSED',
    total: 30000,
    paid: 10000,
    remaining: 20000,
    transactions: [
      {
        id: '00000000-0000-4000-8000-0000000000e1',
        description: 'Geladeira',
        amount: 30000,
        type: 'EXPENSE',
        date: '2026-10-15',
        categoryId: categories[0]!.id,
        accountId: null,
        cardId: CARD_ID,
        invoiceMonth: month,
        installmentGroupId: '00000000-0000-4000-8000-0000000000f1',
        installmentNumber: 2,
        installmentTotal: 3,
        createdAt: '2026-10-15T00:00:00Z',
        updatedAt: '2026-10-15T00:00:00Z',
      },
    ],
    payments: [],
    ...overrides,
  };
}

export const GOAL_ID = '00000000-0000-4000-8000-0000000000b1';

/** Meta "Viagem": R$ 800 de R$ 2.000, prazo em março, R$ 240/mês. */
export function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: GOAL_ID,
    name: 'Viagem',
    targetAmount: 200000,
    deadline: '2027-03-31',
    color: '#0EA5E9',
    icon: 'plane',
    saved: 80000,
    remaining: 120000,
    percent: 40,
    status: 'IN_PROGRESS',
    monthsLeft: 5,
    monthlyAmount: 24000,
    savedThisMonth: 0,
    archivedAt: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}
