import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

import { Logo } from '../components/Logo';
import { useAuth } from '../features/auth/auth-context';
import { NAV_ITEMS } from './navigation';

/**
 * Layout do app autenticado. Mobile first: barra de navegação inferior no celular
 * e barra lateral a partir de telas médias.
 */
export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-stone-200 bg-white px-3 py-5 md:flex">
        <Logo className="mb-8 px-3" />
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-600 hover:bg-stone-100',
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-stone-200 px-3 pt-4">
          <p className="truncate text-sm font-medium text-stone-800">{user?.name}</p>
          <p className="truncate text-xs text-stone-500">{user?.email}</p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 md:hidden">
          <Logo />
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-2 pb-28 md:px-8 md:pt-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV_ITEMS.filter((item) => item.mobile).map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex flex-col items-center gap-1 py-2.5 text-xs font-medium',
                    isActive ? 'text-brand-700' : 'text-stone-500',
                  )
                }
              >
                <Icon className="size-6" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
