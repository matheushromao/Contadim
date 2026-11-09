import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/api-client';
import { fakeAuth, renderWithProviders } from '../../test/render';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('valida os campos antes de enviar', async () => {
    const auth = fakeAuth();
    renderWithProviders(<LoginPage />, { auth, path: '/entrar' });

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument();
    expect(screen.getByText('Informe sua senha')).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('envia e-mail normalizado e redireciona', async () => {
    const auth = fakeAuth();
    const { router } = renderWithProviders(<LoginPage />, { auth, path: '/entrar' });

    await userEvent.type(screen.getByLabelText('E-mail'), '  Maria@Exemplo.com ');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith({
        email: 'maria@exemplo.com',
        password: 'senha-segura',
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('mostra o erro da API', async () => {
    const auth = fakeAuth({
      login: vi
        .fn()
        .mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'E-mail ou senha incorretos')),
    });
    renderWithProviders(<LoginPage />, { auth, path: '/entrar' });

    await userEvent.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos');
  });
});
