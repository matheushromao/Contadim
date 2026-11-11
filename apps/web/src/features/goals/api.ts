import type {
  CreateGoalInput,
  CreateGoalMovementInput,
  Goal,
  GoalMovement,
  UpdateGoalInput,
} from '@contadim/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api-client';
import { fetchAll, invalidateMoneyData, queryKeys } from '../../lib/queries';

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: () => fetchAll<Goal>('/goals'),
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: [...queryKeys.goals, id],
    queryFn: () => api<Goal>(`/goals/${id}`),
  });
}

export function useGoalMovements(goalId: string) {
  return useQuery({
    queryKey: queryKeys.goalMovements(goalId),
    queryFn: () => fetchAll<GoalMovement>(`/goals/${goalId}/movements`),
  });
}

export function useSaveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CreateGoalInput | UpdateGoalInput }) =>
      id
        ? api<Goal>(`/goals/${id}`, { method: 'PATCH', body: input })
        : api<Goal>('/goals', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

/** Guardar ou resgatar: mexe na meta, no saldo da conta e no "guardado no mês". */
export function useAddGoalMovement(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalMovementInput) =>
      api<Goal>(`/goals/${goalId}/movements`, { method: 'POST', body: input }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useDeleteGoalMovement(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (movementId: string) =>
      api<void>(`/goals/${goalId}/movements/${movementId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}
