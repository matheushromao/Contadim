import clsx from 'clsx';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={clsx(
        'inline-block animate-spin rounded-full border-2 border-current border-r-transparent',
        className ?? 'size-6',
      )}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-brand-700">
      <Spinner className="size-8" />
    </div>
  );
}
