import type { EntryType } from '@contadim/core';
import clsx from 'clsx';

const LABELS: Record<EntryType, string> = { EXPENSE: 'Despesa', INCOME: 'Receita' };

/** Alternância Despesa/Receita. */
export function TypeToggle({
  value,
  onChange,
  labels = LABELS,
  disabledType,
}: {
  value: EntryType;
  onChange: (type: EntryType) => void;
  labels?: Record<EntryType, string>;
  /** Tipo indisponível no contexto (ex.: receita em compra no cartão). */
  disabledType?: EntryType | undefined;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Tipo"
      className="grid grid-cols-2 rounded-xl bg-stone-100 p-1"
    >
      {(['EXPENSE', 'INCOME'] as const).map((type) => (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={value === type}
          disabled={disabledType === type}
          onClick={() => onChange(type)}
          className={clsx(
            'min-h-10 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            value === type
              ? type === 'EXPENSE'
                ? 'bg-white text-expense shadow-sm'
                : 'bg-white text-income shadow-sm'
              : 'text-stone-500',
          )}
        >
          {labels[type]}
        </button>
      ))}
    </div>
  );
}
