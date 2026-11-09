import clsx from 'clsx';

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2 font-bold text-brand-800', className)}>
      <svg viewBox="0 0 64 64" aria-hidden="true" className="size-8 shrink-0">
        <rect width="64" height="64" rx="16" fill="#0f766e" />
        <circle cx="32" cy="32" r="17" fill="none" stroke="#fef3c7" strokeWidth="6" />
        <path
          d="M41 24a12 12 0 1 0 0 16"
          fill="none"
          stroke="#0f766e"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="32" cy="32" r="4" fill="#fbbf24" />
      </svg>
      {withText && <span className="text-xl tracking-tight">Contadim</span>}
    </span>
  );
}
