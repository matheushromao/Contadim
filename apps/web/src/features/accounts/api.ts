import type { Account, CreateAccountInput, UpdateAccountInput } from '@contadim/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api-client';
import { fetchAll, queryKeys } from '../../lib/queries';

export const ACCOUNT_TYPE_LABELS: Record<Account['type'], string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  WALLET: 'Carteira',
};

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => fetchAll<Account>('/accounts'),
  });
}

export function useSaveAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CreateAccountInput | UpdateAccountInput }) =>
      id
        ? api<Account>(`/accounts/${id}`, { method: 'PATCH', body: input })
        : api<Account>('/accounts', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
}
