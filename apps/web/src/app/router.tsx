import { createBrowserRouter } from 'react-router';

import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RedirectIfAuthenticated, RequireAuth } from '../features/auth/guards';
import { AppShell } from './AppShell';
import { ComingSoon } from './ComingSoon';
import { NotFoundPage } from './NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuthenticated />,
    children: [
      { path: '/entrar', element: <LoginPage /> },
      { path: '/cadastro', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <ComingSoon title="Resumo do mês" /> },
          { path: '/lancamentos', element: <ComingSoon title="Lançamentos" /> },
          { path: '/contas', element: <ComingSoon title="Contas" /> },
          { path: '/categorias', element: <ComingSoon title="Categorias" /> },
          { path: '/ajustes', element: <ComingSoon title="Ajustes" /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
