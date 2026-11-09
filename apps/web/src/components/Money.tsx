import { type EntryType, formatBRL } from '@contadim/core';
import clsx from 'clsx';

/** Valor formatado em BRL. Com `type`, mostra sinal e cor de receita/despesa. */
export function Money({
  cents,
  type,
  className,
}: {
  cents: number;
  type?: EntryType;
  className?: string;
}) {
  const sign = type === 'EXPENSE' ? '−' : type === 'INCOME' ? '+' : '';
  return (
    <span
      className={clsx(
        'tabular whitespace-nowrap',
        type === 'INCOME' && 'text-income',
        type === 'EXPENSE' && 'text-stone-900',
        className,
      )}
    >
      {sign && `${sign} `}
      {formatBRL(cents)}
    </span>
  );
}
