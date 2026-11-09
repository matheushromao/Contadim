import type { MonthlySummary } from '@contadim/contracts';
import type { YearMonth } from '@contadim/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '../../lib/api-client';
import { queryKeys } from '../../lib/queries';

export function useMonthlySummary(month: YearMonth) {
  return useQuery({
    queryKey: queryKeys.summary(month),
    queryFn: () => api<MonthlySummary>('/summary/monthly', { query: { month } }),
    // Ao trocar de mês, mantém o anterior na tela enquanto carrega (sem "piscar").
    placeholderData: keepPreviousData,
  });
}
