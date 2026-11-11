import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as client from '../../lib/api-client';
import { today } from '../../lib/dates';
import { accounts, card, categories, fakeApi, invoiceDetail, page } from '../../test/fake-api';
import { renderWithProviders } from '../../test/render';
import { CardDetailPage } from './CardDetailPage';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof client>()),
  api: vi.fn(),
}));

const normalize = (value: string) => value.replace(/\s/g, ' ');

describe('CardDetailPage', () => {
  let requestedInvoices: string[];
  let payment: unknown;

  beforeEach(() => {
    requestedInvoices = [];
    payment = undefined;
    vi.mocked(client.api).mockImplementation((path, options = {}) => {
      const invoiceMatch = /^\/cards\/[^/]+\/invoices\/(\d{4}-\d{2})(\/payments)?$/.exec(path);
      if (invoiceMatch) {
        const month = invoiceMatch[1]!;
        if (invoiceMatch[2] && options.method === 'POST') {
          payment = options.body;
          return Promise.resolve(invoiceDetail(month));
        }
        requestedInvoices.push(month);
        return Promise.resolve(invoiceDetail(month));
      }
      return fakeApi({
        [`GET /cards/${card.id}`]: () => card,
        'GET /accounts': () => page(accounts),
        'GET /categories': () => page(categories),
      })(path, options);
    });
  });

  const render = () =>
    renderWithProviders(<CardDetailPage />, { path: '/cartoes/:id', url: `/cartoes/${card.id}` });

  it('abre na fatura atual, com totais, status e parcelas', async () => {
    render();

    expect(await screen.findByText('Fatura de dezembro de 2026')).toBeInTheDocument();
    expect(requestedInvoices).toEqual(['2026-12']);
    expect(await screen.findByText('Geladeira')).toBeInTheDocument();
    expect(screen.getByText(/parcela 2\/3/)).toBeInTheDocument();
    expect(screen.getByText('Fechada')).toBeInTheDocument();
  });

  it('navega entre faturas', async () => {
    render();
    await screen.findByText('Geladeira');

    await userEvent.click(screen.getByRole('button', { name: 'Próxima fatura' }));

    expect(await screen.findByText('Fatura de janeiro de 2027')).toBeInTheDocument();
    await waitFor(() => expect(requestedInvoices).toContain('2027-01'));
    expect(screen.getByRole('button', { name: 'Voltar para a fatura atual' })).toBeInTheDocument();
  });

  it('paga a fatura com o restante já preenchido', async () => {
    render();
    await userEvent.click(await screen.findByRole('button', { name: 'Pagar fatura' }));

    const amount = await screen.findByLabelText('Valor do pagamento');
    expect(normalize((amount as HTMLInputElement).value)).toBe('R$ 200,00');
    expect(screen.getByLabelText('Pagar com')).toHaveValue(accounts[0]!.id);

    await userEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }));

    await waitFor(() =>
      expect(payment).toEqual({ accountId: accounts[0]!.id, amount: 20000, date: today() }),
    );
    expect(await screen.findByText('Fatura paga! 🎉')).toBeInTheDocument();
  });
});
