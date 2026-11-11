import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as client from '../../lib/api-client';
import { today } from '../../lib/dates';
import { LAST_ACCOUNT_KEY, LAST_SOURCE_KEY } from '../../lib/storage';
import { accounts, card, categories, fakeApi, page } from '../../test/fake-api';
import { renderWithProviders } from '../../test/render';
import { TransactionFormSheet } from './TransactionFormSheet';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof client>()),
  api: vi.fn(),
}));

const [wallet, bank] = accounts as [(typeof accounts)[0], (typeof accounts)[0]];
const food = categories[0]!;
const salary = categories[2]!;
const normalize = (text: string | null) => (text ?? '').replace(/\s/g, ' ');

describe('Lançamento rápido', () => {
  let created: { path: string; body: unknown } | undefined;

  beforeEach(() => {
    created = undefined;
    vi.mocked(client.api).mockImplementation(
      fakeApi({
        'GET /accounts': () => page(accounts),
        'GET /categories': () => page(categories),
        'GET /cards': () => page([card]),
        'POST /transactions': ({ body }) => {
          created = { path: '/transactions', body };
          return { id: 'tx-1', ...(body as object) };
        },
        [`POST /cards/${card.id}/purchases`]: ({ body }) => {
          created = { path: `/cards/${card.id}/purchases`, body };
          return { groupId: 'g-1' };
        },
      }),
    );
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  const open = () => {
    const onClose = vi.fn();
    renderWithProviders(<TransactionFormSheet open onClose={onClose} />);
    return { onClose };
  };

  it('só exige valor e categoria: data de hoje e conta já vêm preenchidas', async () => {
    const { onClose } = open();

    const amount = await screen.findByLabelText('Valor');
    expect(amount).toHaveFocus();
    expect(screen.getByLabelText('Data')).toHaveValue(today());
    expect(screen.getByLabelText('Pagar com')).toHaveValue(`account:${wallet.id}`);
    expect(screen.getByRole('radio', { name: 'Despesa' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByLabelText('Parcelas')).not.toBeInTheDocument();

    await userEvent.type(amount, '4590');
    await userEvent.click(screen.getByRole('button', { name: /Alimentação/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Lançar' }));

    await waitFor(() =>
      expect(created).toEqual({
        path: '/transactions',
        body: {
          amount: 4590,
          type: 'EXPENSE',
          date: today(),
          categoryId: food.id,
          accountId: wallet.id,
          description: null,
        },
      }),
    );
    expect(await screen.findByText('Anotado! 📝')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(window.localStorage.getItem(LAST_SOURCE_KEY)).toBe(`account:${wallet.id}`);
  });

  it('pede valor e categoria quando faltam', async () => {
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Lançar' }));

    expect(await screen.findByText('O valor deve ser maior que zero')).toBeInTheDocument();
    expect(screen.getByText('Escolha uma categoria')).toBeInTheDocument();
    expect(created).toBeUndefined();
  });

  it('mostra só categorias do tipo escolhido', async () => {
    open();
    await screen.findByLabelText('Valor');
    expect(screen.queryByRole('button', { name: /Salário/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Receita' }));

    expect(screen.getByRole('button', { name: /Salário/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Alimentação/ })).not.toBeInTheDocument();
  });

  it('lembra a última forma de pagamento usada', async () => {
    window.localStorage.setItem(LAST_SOURCE_KEY, `card:${card.id}`);
    open();
    expect(await screen.findByLabelText('Pagar com')).toHaveValue(`card:${card.id}`);
  });

  it('usa a última conta da versão anterior quando não há forma salva', async () => {
    window.localStorage.setItem(LAST_ACCOUNT_KEY, bank.id);
    open();
    expect(await screen.findByLabelText('Pagar com')).toHaveValue(`account:${bank.id}`);
  });

  describe('no cartão de crédito', () => {
    it('parcela a compra e mostra a prévia das parcelas', async () => {
      open();
      await userEvent.type(await screen.findByLabelText('Valor'), '120000');
      await userEvent.selectOptions(screen.getByLabelText('Pagar com'), `card:${card.id}`);
      await userEvent.clear(screen.getByLabelText('Data'));
      await userEvent.type(screen.getByLabelText('Data'), '2026-11-15');
      await userEvent.selectOptions(screen.getByLabelText('Parcelas'), '12');

      // Fecha dia 3: compra em 15/11 entra na fatura que vence em dezembro.
      expect(normalize(screen.getByText(/12x de/).textContent)).toBe(
        '12x de R$ 100,00 · 1ª na fatura de dezembro de 2026',
      );

      await userEvent.click(screen.getByRole('button', { name: /Alimentação/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Lançar' }));

      await waitFor(() =>
        expect(created).toEqual({
          path: `/cards/${card.id}/purchases`,
          body: {
            amount: 120000,
            installments: 12,
            date: '2026-11-15',
            categoryId: food.id,
            description: null,
          },
        }),
      );
      expect(await screen.findByText('Anotado em 12x! 💳')).toBeInTheDocument();
    });

    it('mostra quando os centavos não dividem igualmente', async () => {
      open();
      await userEvent.type(await screen.findByLabelText('Valor'), '1000');
      await userEvent.selectOptions(screen.getByLabelText('Pagar com'), `card:${card.id}`);
      await userEvent.selectOptions(screen.getByLabelText('Parcelas'), '3');

      expect(normalize(screen.getByText(/1ª de/).textContent)).toMatch(
        /^1ª de R\$ 3,34 \+ 2x de R\$ 3,33 · 1ª na fatura de /,
      );
    });

    it('só aceita despesa: escolher o cartão volta o tipo para despesa', async () => {
      open();
      await screen.findByLabelText('Valor');
      await userEvent.click(screen.getByRole('radio', { name: 'Receita' }));
      await userEvent.click(screen.getByRole('button', { name: new RegExp(salary.name) }));

      await userEvent.selectOptions(screen.getByLabelText('Pagar com'), `card:${card.id}`);

      expect(screen.getByRole('radio', { name: 'Despesa' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      expect(screen.getByRole('radio', { name: 'Receita' })).toBeDisabled();
      expect(
        screen.queryByRole('button', { name: new RegExp(salary.name) }),
      ).not.toBeInTheDocument();
    });
  });
});
