import { MAX_CENTS } from '@contadim/contracts';
import { formatBRL } from '@contadim/core';
import clsx from 'clsx';
import { forwardRef, useId } from 'react';

export interface MoneyInputProps {
  label: string;
  value: number | undefined;
  onChange: (cents: number) => void;
  onBlur?: () => void;
  error?: string | undefined;
  autoFocus?: boolean;
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Campo de valor no estilo "maquininha": cada dígito entra pela direita
 * (digitar 1, 2, 5, 0 vira R$ 12,50). Nunca passa por float.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { label, value, onChange, onBlur, error, autoFocus, size = 'md', className },
  ref,
) {
  const id = useId();

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        value={formatBRL(value ?? 0)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
          onChange(Math.min(Number(digits || '0'), MAX_CENTS));
        }}
        onFocus={(event) => {
          // Cursor sempre no fim: os dígitos entram pela direita.
          const input = event.currentTarget;
          requestAnimationFrame(() =>
            input.setSelectionRange(input.value.length, input.value.length),
          );
        }}
        onBlur={onBlur}
        className={clsx(
          'tabular rounded-xl border bg-white px-3 font-semibold text-stone-900',
          'focus:outline-2 focus:outline-offset-0 focus:outline-brand-600',
          size === 'lg' ? 'min-h-16 text-3xl' : 'min-h-11 text-base',
          error ? 'border-rose-400' : 'border-stone-300',
        )}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
});
