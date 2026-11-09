import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/api-client';
import { fakeAuth, renderWithProviders } from '../../test/render';
import { RegisterPage } from './RegisterPage';

describe('RegisterPage', () => {
  const fill = async () => {
    await userEvent.type(screen.getByLabelText('Como podemos te chamar?'), 'Maria');
    await userEvent.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'senha-segura');
    await userEvent.click(screen.getByRole('button', { name: 'Criar minha conta' }));
  };

  it('exige senha com pelo menos 8 caracteres', async () => {
    const auth = fakeAuth();
    renderWithProviders(<RegisterPage />, { auth, path: '/cadastro' });

    await userEvent.type(screen.getByLabelText('Senha'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Criar minha conta' }));

    expect(
      await screen.findByText('A senha precisa ter pelo menos 8 caracteres'),
    ).toBeInTheDocument();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('cria a conta e entra no app', async () => {
    const auth = fakeAuth();
    const { router } = renderWithProviders(<RegisterPage />, { auth, path: '/cadastro' });
    await fill();

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(auth.register).toHaveBeenCalledWith({
      name: 'Maria',
      email: 'maria@exemplo.com',
      password: 'senha-segura',
    });
  });

  it('mostra e-mail já cadastrado', async () => {
    const auth = fakeAuth({
      register: vi
        .fn()
        .mockRejectedValue(new ApiError(409, 'CONFLICT', 'Já existe uma conta com este e-mail')),
    });
    renderWithProviders(<RegisterPage />, { auth, path: '/cadastro' });
    await fill();

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma conta');
  });
});
