import type {
  CardPurchase,
  CreateCardPurchaseInput,
  CreateCreditCardInput,
  CreateInvoicePaymentInput,
  CreditCard,
  InvoiceDetail,
  UpdateCardPurchaseInput,
  UpdateCreditCardInput,
} from '@contadim/contracts';
import type { YearMonth } from '@contadim/core';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api-client';
import { fetchAll, invalidateMoneyData, queryKeys } from '../../lib/queries';

export function useCards() {
  return useQuery({
    queryKey: queryKeys.cards,
    queryFn: () => fetchAll<CreditCard>('/cards'),
  });
}

export function useCard(id: string) {
  return useQuery({
    queryKey: [...queryKeys.cards, id],
    queryFn: () => api<CreditCard>(`/cards/${id}`),
  });
}

export function useSaveCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: string;
      input: CreateCreditCardInput | UpdateCreditCardInput;
    }) =>
      id
        ? api<CreditCard>(`/cards/${id}`, { method: 'PATCH', body: input })
        : api<CreditCard>('/cards', { method: 'POST', body: input }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/cards/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useInvoice(cardId: string, month: YearMonth) {
  return useQuery({
    queryKey: queryKeys.invoice(cardId, month),
    queryFn: () => api<InvoiceDetail>(`/cards/${cardId}/invoices/${month}`),
    placeholderData: keepPreviousData,
  });
}

export function usePayInvoice(cardId: string, month: YearMonth) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoicePaymentInput) =>
      api<InvoiceDetail>(`/cards/${cardId}/invoices/${month}/payments`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useDeleteInvoicePayment(cardId: string, month: YearMonth) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api<void>(`/cards/${cardId}/invoices/${month}/payments/${paymentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useUpdatePurchase(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, input }: { groupId: string; input: UpdateCardPurchaseInput }) =>
      api<CardPurchase>(`/cards/${cardId}/purchases/${groupId}`, { method: 'PATCH', body: input }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useDeletePurchase(cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      api<void>(`/cards/${cardId}/purchases/${groupId}`, { method: 'DELETE' }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useCreateCardPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: CreateCardPurchaseInput }) =>
      api<CardPurchase>(`/cards/${cardId}/purchases`, { method: 'POST', body: input }),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}
