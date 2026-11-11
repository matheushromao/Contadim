import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as client from '../../lib/api-client';
import { card, fakeApi, page } from '../../test/fake-api';
import { renderWithProviders } from '../../test/render';
import { CardsPage } from './CardsPage';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof client>()),
  api: vi.fn(),
}));

const normalize = (text: string | null) => (text ?? '').replace(/\s/g, ' ');

describe('CardsPage', () => {
  beforeEach(() => {
    vi.mocked(client.api).mockReset();
  });

  it('mostra cada cartão com fatura atual, status e limite disponível', async () => {
    vi.mocked(client.api).mockImplementation(fakeApi({ 'GET /cards': () => page([card]) }));
    renderWithProviders(<CardsPage />, { path: '/cartoes' });

    const link = await screen.findByRole('link', { name: 'Ver faturas do cartão Nubank' });
    expect(link).toHaveAttribute('href', `/cartoes/${card.id}`);
    expect(screen.getByText('Aberta')).toBeInTheDocument();
    expect(normalize(screen.getByText(/Disponível/).textContent)).toBe(
      'Disponível: R$ 3.800,00 de R$ 5.000,00',
    );
    expect(screen.getByRole('progressbar', { name: 'Limite usado: 24%' })).toBeInTheDocument();
  });

  it('mostra um convite quando não há cartões', async () => {
    vi.mocked(client.api).mockImplementation(fakeApi({ 'GET /cards': () => page([]) }));
    renderWithProviders(<CardsPage />, { path: '/cartoes' });

    expect(await screen.findByText('Nenhum cartão cadastrado')).toBeInTheDocument();
  });
});
