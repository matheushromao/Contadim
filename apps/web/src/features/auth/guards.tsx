import { Navigate, Outlet, useLocation } from 'react-router';

import { FullPageSpinner } from '../../components/ui/Spinner';
import { useAuth } from './auth-context';

/** Rotas que exigem login: redireciona para /entrar guardando o destino. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'anonymous') {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Telas de login/cadastro: quem já está logado vai direto para o app. */
export function RedirectIfAuthenticated() {
  const { status } = useAuth();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
