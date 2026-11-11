import type { Transaction } from '@contadim/contracts';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as client from '../../lib/api-client';
import { accounts, card, categories, fakeApi, invoiceDetail, page } from '../../test/fake-api';
import { renderWithProviders } from '../../test/render';
import { MonthInvoices } from '../summary/MonthInvoices';
import { TransactionList } from './TransactionList';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof client>()),
  api: vi.fn(),
}));

const cardCharge = invoiceDetail('2026-12').transactions[0]!;
const accountExpense: Transaction = {
  ...cardCharge,
  id: '00000000-0000-4000-8000-0000000000e2',
  description: 'Padaria',
  amount: 1500,
  date: '2026-12-05',
  accountId: accounts[0]!.id,
  cardId: null,
  invoiceMonth: null,
  installmentGroupId: null,
  installmentNumber: null,
  installmentTotal: null,
};

describe('lançamentos de cartão', () => {
  beforeEach(() => {
    vi.mocked(client.api).mockImplementation(
      fakeApi({
        'GET /accounts': () => page(accounts),
        'GET /categories': () => page(categories),
        'GET /cards': () => page([card]),
      }),
    );
  });

  it('agrupa as parcelas do cartão separadas dos dias, com o selo da parcela', async () => {
    renderWithProviders(
      <TransactionList transactions={[accountExpense, cardCharge]} onSelect={vi.fn()} />,
    );

    const cardSection = await screen.findByRole('region', { name: 'Cartão Nubank' });
    expect(within(cardSection).getByText('Geladeira')).toBeInTheDocument();
    expect(within(cardSection).getByText('2/3')).toBeInTheDocument();
    expect(within(cardSection).getByText(/compra/)).toBeInTheDocument();
    expect(screen.getByText('Padaria')).toBeInTheDocument();
  });

  it('mostra as faturas do mês com total e vencimento', async () => {
    renderWithProviders(
      <MonthInvoices month="2026-12" transactions={[accountExpense, cardCharge]} />,
    );

    const link = await screen.findByRole('link', { name: /Nubank/ });
    expect(link).toHaveAttribute('href', `/cartoes/${card.id}?fatura=2026-12`);
    expect(within(link).getByText('Vence em 10 de dezembro')).toBeInTheDocument();
    expect(within(link).getByText(/300,00/)).toBeInTheDocument();
  });
});
