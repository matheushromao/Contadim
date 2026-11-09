import { shiftMonth, type YearMonth } from '@contadim/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { currentYearMonth, formatMonthLabel } from '../lib/dates';

export function MonthNavigator({
  month,
  onChange,
}: {
  month: YearMonth;
  onChange: (month: YearMonth) => void;
}) {
  const isCurrent = month === currentYearMonth();

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white px-2 py-1.5 ring-1 ring-stone-200">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Mês anterior"
        className="rounded-full p-2 text-stone-600 hover:bg-stone-100"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <div className="text-center">
        <p className="font-semibold capitalize" aria-live="polite">
          {formatMonthLabel(month)}
        </p>
        {!isCurrent && (
          <button
            type="button"
            onClick={() => onChange(currentYearMonth())}
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            Voltar para o mês atual
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Próximo mês"
        className="rounded-full p-2 text-stone-600 hover:bg-stone-100"
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
