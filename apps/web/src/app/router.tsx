import { createBrowserRouter } from 'react-router';

import { FullPageSpinner } from '../components/ui/Spinner';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RedirectIfAuthenticated, RequireAuth } from '../features/auth/guards';
import { AppShell } from './AppShell';
import { NotFoundPage } from './NotFoundPage';

/** Telas internas carregadas sob demanda (chunks separados). */
export const router = createBrowserRouter([
  {
    HydrateFallback: FullPageSpinner,
    children: [
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
              {
                index: true,
                lazy: () =>
                  import('../features/summary/SummaryPage').then((m) => ({
                    Component: m.SummaryPage,
                  })),
              },
              {
                path: '/lancamentos',
                lazy: () =>
                  import('../features/transactions/TransactionsPage').then((m) => ({
                    Component: m.TransactionsPage,
                  })),
              },
              {
                path: '/contas',
                lazy: () =>
                  import('../features/accounts/AccountsPage').then((m) => ({
                    Component: m.AccountsPage,
                  })),
              },
              {
                path: '/categorias',
                lazy: () =>
                  import('../features/categories/CategoriesPage').then((m) => ({
                    Component: m.CategoriesPage,
                  })),
              },
              {
                path: '/ajustes',
                lazy: () =>
                  import('../features/settings/SettingsPage').then((m) => ({
                    Component: m.SettingsPage,
                  })),
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
