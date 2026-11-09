import type {
  CreateTransactionInput,
  Transaction,
  UpdateTransactionInput,
} from '@contadim/contracts';
import type { EntryType, YearMonth } from '@contadim/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api-client';
import { fetchAll, invalidateMoneyData, queryKeys } from '../../lib/queries';

export function useMonthTransactions(month: YearMonth, type?: EntryType) {
  const filters = { month, type };
  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: () => fetchAll<Transaction>('/transactions', filters),
  });
}

export function useSaveTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: string;
      input: CreateTransactionInput | UpdateTransactionInput;
    }) =>
      id
        ? api<Transaction>(`/transactions/${id}`, { method: 'PATCH', body: input })
        : api<Transaction>('/transactions', { method: 'POST', body: input }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}
