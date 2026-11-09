import type { YearMonth } from '@contadim/core';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

import { currentYearMonth, parseMonthParam } from './dates';

/** Mês selecionado guardado na URL (`?mes=2026-11`): dá para compartilhar e voltar. */
export function useMonthParam(): [YearMonth, (month: YearMonth) => void] {
  const [params, setParams] = useSearchParams();
  const month = parseMonthParam(params.get('mes'));

  const setMonth = useCallback(
    (next: YearMonth) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          if (next === currentYearMonth()) updated.delete('mes');
          else updated.set('mes', next);
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return [month, setMonth];
}
