import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AppShell } from '../../app/AppShell';
import { fakeAuth } from '../../test/render';
import { AuthContext, type AuthContextValue } from './auth-context';
import { RedirectIfAuthenticated, RequireAuth } from './guards';

function renderRoutes(auth: AuthContextValue, initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        element: <RedirectIfAuthenticated />,
        children: [{ path: '/entrar', element: <p>tela de login</p> }],
      },
      {
        element: <RequireAuth />,
        children: [
          { element: <AppShell />, children: [{ index: true, element: <p>conteúdo do app</p> }] },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return router;
}

const user = { id: 'u1', name: 'Maria', email: 'maria@exemplo.com', createdAt: '' };

describe('guards de rota', () => {
  it('mostra carregamento enquanto a sessão é verificada', () => {
    renderRoutes(fakeAuth({ status: 'loading' }), '/');
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('manda quem não está logado para /entrar', () => {
    const router = renderRoutes(fakeAuth({ status: 'anonymous' }), '/');
    expect(router.state.location.pathname).toBe('/entrar');
    expect(screen.getByText('tela de login')).toBeInTheDocument();
  });

  it('mostra o app com a navegação para quem está logado', () => {
    renderRoutes(fakeAuth({ status: 'authenticated', user }), '/');
    expect(screen.getByText('conteúdo do app')).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: 'Principal' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Resumo' })[0]).toHaveAttribute('href', '/');
  });

  it('tira quem já está logado da tela de login', () => {
    const router = renderRoutes(fakeAuth({ status: 'authenticated', user }), '/entrar');
    expect(router.state.location.pathname).toBe('/');
  });
});
