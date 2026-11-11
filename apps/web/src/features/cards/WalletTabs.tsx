import clsx from 'clsx';
import { NavLink } from 'react-router';

/** No celular, "Carteira" reúne contas e cartões: estas abas alternam entre os dois. */
export function WalletTabs() {
  return (
    <nav
      aria-label="Carteira"
      className="mb-4 grid grid-cols-2 rounded-xl bg-stone-100 p-1 md:hidden"
    >
      {[
        { to: '/contas', label: 'Contas' },
        { to: '/cartoes', label: 'Cartões' },
      ].map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            clsx(
              'flex min-h-10 items-center justify-center rounded-lg text-sm font-semibold',
              isActive ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500',
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
