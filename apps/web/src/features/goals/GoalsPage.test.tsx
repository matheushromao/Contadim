import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as client from '../../lib/api-client';
import { today } from '../../lib/dates';
import { accounts, fakeApi, goal, GOAL_ID, page } from '../../test/fake-api';
import { renderWithProviders } from '../../test/render';
import { GoalDetailPage } from './GoalDetailPage';
import { GoalsPage } from './GoalsPage';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof client>()),
  api: vi.fn(),
}));

const normalize = (value: string | null) => (value ?? '').replace(/\s/g, ' ');

describe('Metas', () => {
  let movement: unknown;

  beforeEach(() => {
    movement = undefined;
    vi.mocked(client.api).mockImplementation(
      fakeApi({
        'GET /goals': () =>
          page([
            goal(),
            goal({
              id: 'g2',
              name: 'Reserva',
              deadline: null,
              status: 'NO_DEADLINE',
              monthsLeft: null,
              monthlyAmount: null,
            }),
          ]),
        [`GET /goals/${GOAL_ID}`]: () => goal(),
        [`GET /goals/${GOAL_ID}/movements`]: () => page([]),
        [`POST /goals/${GOAL_ID}/movements`]: ({ body }) => {
          movement = body;
          return goal({ saved: 110000 });
        },
        'GET /accounts': () => page(accounts),
      }),
    );
  });

  it('lista as metas com progresso e o plano mensal', async () => {
    renderWithProviders(<GoalsPage />, { path: '/metas' });

    const travel = await screen.findByRole('link', { name: 'Ver a meta Viagem' });
    expect(travel).toHaveAttribute('href', `/metas/${GOAL_ID}`);
    expect(normalize(screen.getByText(/Guarde/).textContent)).toBe(
      'Guarde R$ 240,00/mês até março de 2027',
    );
    expect(screen.getByRole('progressbar', { name: 'Viagem: 40% guardado' })).toBeInTheDocument();
    expect(screen.getByText('Sem prazo')).toBeInTheDocument();
    expect(normalize(screen.getByText(/sem prazo definido/).textContent)).toMatch(/^Faltam R\$/);
  });

  it('guarda dinheiro com o valor do plano já sugerido', async () => {
    renderWithProviders(<GoalDetailPage />, { path: '/metas/:id', url: `/metas/${GOAL_ID}` });

    await userEvent.click(await screen.findByRole('button', { name: 'Guardar' }));
    const amount = await screen.findByLabelText('Valor');
    expect(normalize((amount as HTMLInputElement).value)).toBe('R$ 240,00');
    expect(screen.getByLabelText('Sai da conta')).toHaveValue(accounts[0]!.id);

    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }),
    );
    await waitFor(() =>
      expect(movement).toEqual({
        type: 'DEPOSIT',
        accountId: accounts[0]!.id,
        amount: 24000,
        date: today(),
        note: null,
      }),
    );
    expect(await screen.findByText('Guardado! 💪')).toBeInTheDocument();
  });

  it('não deixa resgatar mais do que está guardado', async () => {
    renderWithProviders(<GoalDetailPage />, { path: '/metas/:id', url: `/metas/${GOAL_ID}` });

    await userEvent.click(await screen.findByRole('button', { name: 'Resgatar' }));
    const amount = await screen.findByLabelText('Valor');
    expect(normalize((amount as HTMLInputElement).value)).toBe('R$ 800,00');

    await userEvent.type(amount, '1');
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Resgatar' }),
    );

    expect(normalize((await screen.findByText(/Você só pode resgatar até/)).textContent)).toBe(
      'Você só pode resgatar até R$ 800,00',
    );
    expect(movement).toBeUndefined();
  });

  it('mostra um convite quando não há metas', async () => {
    vi.mocked(client.api).mockImplementation(fakeApi({ 'GET /goals': () => page([]) }));
    renderWithProviders(<GoalsPage />, { path: '/metas' });
    expect(await screen.findByText('Nenhuma meta ainda')).toBeInTheDocument();
  });
});
