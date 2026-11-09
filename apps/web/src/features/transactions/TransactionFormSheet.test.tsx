import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as client from '../../lib/api-client';
import { today } from '../../lib/dates';
import { LAST_ACCOUNT_KEY } from '../../lib/storage';
import { accounts, categories, fakeApi, page } from '../../test/fake-api';
import { renderWithProviders } from '../../test/render';
import { TransactionFormSheet } from './TransactionFormSheet';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof client>()),
  api: vi.fn(),
}));

describe('Lançamento rápido', () => {
  let created: unknown;

  beforeEach(() => {
    created = undefined;
    vi.mocked(client.api).mockImplementation(
      fakeApi({
        'GET /accounts': () => page(accounts),
        'GET /categories': () => page(categories),
        'POST /transactions': ({ body }) => {
          created = body;
          return { id: 'tx-1', ...(body as object) };
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
    expect(screen.getByLabelText('Conta')).toHaveValue('00000000-0000-4000-8000-0000000000a1');
    expect(screen.getByRole('radio', { name: 'Despesa' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.type(amount, '4590');
    await userEvent.click(screen.getByRole('button', { name: /Alimentação/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Lançar' }));

    await waitFor(() =>
      expect(created).toEqual({
        amount: 4590,
        type: 'EXPENSE',
        date: today(),
        categoryId: '00000000-0000-4000-8000-0000000000c1',
        accountId: '00000000-0000-4000-8000-0000000000a1',
        description: null,
      }),
    );
    expect(await screen.findByText('Anotado! 📝')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(window.localStorage.getItem(LAST_ACCOUNT_KEY)).toBe(
      '00000000-0000-4000-8000-0000000000a1',
    );
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

  it('lembra a última conta usada', async () => {
    window.localStorage.setItem(LAST_ACCOUNT_KEY, '00000000-0000-4000-8000-0000000000a2');
    open();
    expect(await screen.findByLabelText('Conta')).toHaveValue(
      '00000000-0000-4000-8000-0000000000a2',
    );
  });
});
