import type { MonthlySummary } from '@contadim/contracts';
import { shiftMonth } from '@contadim/core';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as client from '../../lib/api-client';
import { currentYearMonth } from '../../lib/dates';
import { accounts, categories, fakeApi, page } from '../../test/fake-api';
import { fakeAuth, renderWithProviders } from '../../test/render';
import { SummaryPage } from './SummaryPage';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof client>()),
  api: vi.fn(),
}));

const summaryFor = (month: string): MonthlySummary => ({
  month,
  totalIncome: 500000,
  totalExpense: 200000,
  balance: 300000,
  expensesByCategory: [
    {
      category: {
        id: '00000000-0000-4000-8000-0000000000c2',
        name: 'Moradia',
        color: '#8B5CF6',
        icon: 'house',
      },
      total: 150000,
      percent: 75,
    },
    {
      category: {
        id: '00000000-0000-4000-8000-0000000000c1',
        name: 'Alimentação',
        color: '#F97316',
        icon: 'utensils',
      },
      total: 50000,
      percent: 25,
    },
  ],
  incomesByCategory: [],
});

const normalize = (text: string | null) => (text ?? '').replace(/\s/g, ' ');

describe('SummaryPage', () => {
  const requestedMonths: string[] = [];

  beforeEach(() => {
    requestedMonths.length = 0;
    vi.mocked(client.api).mockImplementation(
      fakeApi({
        'GET /summary/monthly': ({ query }) => {
          requestedMonths.push(String(query?.month));
          return summaryFor(String(query?.month));
        },
        'GET /transactions': () => page([]),
        'GET /accounts': () => page(accounts),
        'GET /categories': () => page(categories),
      }),
    );
  });

  const user = { id: 'u1', name: 'Maria Silva', email: 'm@e.com', createdAt: '' };

  it('mostra saldo, totais e gastos por categoria do mês atual', async () => {
    renderWithProviders(<SummaryPage />, { auth: fakeAuth({ status: 'authenticated', user }) });

    expect(screen.getByText('Oi, Maria! 👋')).toBeInTheDocument();
    expect(normalize((await screen.findByText(/R\$ 3\.000,00/)).textContent)).toBe('R$ 3.000,00');
    expect(screen.getByText('Mandou bem!', { exact: false })).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Moradia: 75% das despesas' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Nenhum lançamento neste mês')).toBeInTheDocument();
    expect(requestedMonths).toEqual([currentYearMonth()]);
  });

  it('navega para o mês anterior', async () => {
    renderWithProviders(<SummaryPage />, { auth: fakeAuth({ status: 'authenticated', user }) });
    await screen.findByText(/R\$ 3\.000,00/);

    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));

    await waitFor(() => expect(requestedMonths).toContain(shiftMonth(currentYearMonth(), -1)));
    expect(screen.getByRole('button', { name: 'Voltar para o mês atual' })).toBeInTheDocument();
  });
});
