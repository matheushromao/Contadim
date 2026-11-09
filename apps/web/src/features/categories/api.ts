import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@contadim/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api-client';
import { fetchAll, queryKeys } from '../../lib/queries';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => fetchAll<Category>('/categories'),
    staleTime: 5 * 60_000,
  });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: string;
      input: CreateCategoryInput | UpdateCategoryInput;
    }) =>
      id
        ? api<Category>(`/categories/${id}`, { method: 'PATCH', body: input })
        : api<Category>('/categories', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}
