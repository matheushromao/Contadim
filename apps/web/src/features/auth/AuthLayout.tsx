import type { ReactNode } from 'react';

import { Logo } from '../../components/Logo';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo className="mb-8" />
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
        <p className="mt-1 mb-6 text-stone-600">{subtitle}</p>
        {children}
        <p className="mt-6 text-center text-sm text-stone-600">{footer}</p>
      </div>
    </main>
  );
}
