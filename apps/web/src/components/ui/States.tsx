import type { ReactNode } from 'react';

import { ApiError } from '../../lib/api-client';
import { Button } from './Button';
import { Spinner } from './Spinner';

export function LoadingState() {
  return (
    <div className="flex justify-center py-12 text-brand-700">
      <Spinner />
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiError ? error.message : 'Não foi possível carregar. Tente novamente';
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-stone-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-300 px-6 py-10 text-center">
      <p className="text-4xl" aria-hidden="true">
        {emoji}
      </p>
      <p className="font-semibold text-stone-800">{title}</p>
      {children && <div className="text-sm text-stone-600">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {action}
    </div>
  );
}
