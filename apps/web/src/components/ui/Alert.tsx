import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'info';
  children: ReactNode;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx(
        'rounded-xl px-4 py-3 text-sm',
        tone === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-brand-50 text-brand-900',
      )}
    >
      {children}
    </div>
  );
}
