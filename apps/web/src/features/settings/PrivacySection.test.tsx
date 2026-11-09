import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as client from '../../lib/api-client';
import * as download from '../../lib/download';
import { fakeApi } from '../../test/fake-api';
import { fakeAuth, renderWithProviders } from '../../test/render';
import { PrivacySection } from './PrivacySection';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof client>()),
  api: vi.fn(),
}));
vi.mock('../../lib/download', () => ({ downloadJson: vi.fn() }));

describe('PrivacySection', () => {
  let deletedWith: unknown;

  beforeEach(() => {
    deletedWith = undefined;
    vi.mocked(download.downloadJson).mockClear();
    vi.mocked(client.api).mockImplementation(
      fakeApi({
        'GET /users/me/export': () => ({ exportedAt: '2026-11-09T12:00:00.000Z', version: 1 }),
        'DELETE /users/me': ({ body }) => {
          deletedWith = body;
          if ((body as { password: string }).password !== 'senha-certa') {
            throw new client.ApiError(403, 'FORBIDDEN', 'Senha incorreta');
          }
          return undefined;
        },
      }),
    );
  });

  it('baixa os dados em JSON', async () => {
    renderWithProviders(<PrivacySection />);
    await userEvent.click(screen.getByRole('button', { name: /Baixar meus dados/ }));

    await waitFor(() =>
      expect(download.downloadJson).toHaveBeenCalledWith(
        'contadim-dados-2026-11-09.json',
        expect.objectContaining({ version: 1 }),
      ),
    );
    expect(await screen.findByText('Download iniciado 📦')).toBeInTheDocument();
  });

  it('pede a senha e mostra quando está errada', async () => {
    const auth = fakeAuth({ status: 'authenticated' });
    renderWithProviders(<PrivacySection />, { auth });

    await userEvent.click(screen.getByRole('button', { name: /Excluir minha conta/ }));
    expect(screen.getByText('Isso não tem volta.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Digite sua senha para confirmar'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: 'Excluir para sempre' }));

    expect(await screen.findByText('Senha incorreta')).toBeInTheDocument();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('exclui a conta e encerra a sessão', async () => {
    const auth = fakeAuth({ status: 'authenticated' });
    renderWithProviders(<PrivacySection />, { auth });

    await userEvent.click(screen.getByRole('button', { name: /Excluir minha conta/ }));
    await userEvent.type(screen.getByLabelText('Digite sua senha para confirmar'), 'senha-certa');
    await userEvent.click(screen.getByRole('button', { name: 'Excluir para sempre' }));

    await waitFor(() => expect(auth.logout).toHaveBeenCalled());
    expect(deletedWith).toEqual({ password: 'senha-certa' });
  });
});
