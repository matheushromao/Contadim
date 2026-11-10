import { isValidYearMonth } from '@contadim/core';
import { z } from 'zod';

import { invoiceSummarySchema } from './cards';
import {
  dateTimeSchema,
  idSchema,
  isoDateSchema,
  positiveCentsSchema,
  yearMonthSchema,
} from './common';
import { transactionSchema } from './transactions';

const monthIndex = (month: string) => {
  const [year, value] = month.split('-').map(Number) as [number, number];
  return year * 12 + value;
};

/** Intervalo de faturas (por mês de vencimento). No máximo 36 meses por consulta. */
export const listInvoicesQuerySchema = z
  .object({
    from: yearMonthSchema.optional(),
    to: yearMonthSchema.optional(),
  })
  .refine(
    ({ from, to }) =>
      !from || !to || !isValidYearMonth(from) || !isValidYearMonth(to) || from <= to,
    { message: '"from" deve ser anterior ou igual a "to"', path: ['from'] },
  )
  .refine(({ from, to }) => !from || !to || monthIndex(to) - monthIndex(from) < 36, {
    message: 'Consulte no máximo 36 meses por vez',
    path: ['to'],
  });
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;

export const invoiceListSchema = z.object({ data: z.array(invoiceSummarySchema) });

export const invoicePaymentSchema = z.object({
  id: idSchema,
  cardId: idSchema,
  invoiceMonth: yearMonthSchema,
  accountId: idSchema,
  amount: positiveCentsSchema,
  date: isoDateSchema,
  createdAt: dateTimeSchema,
});
export type InvoicePayment = z.infer<typeof invoicePaymentSchema>;

export const invoiceDetailSchema = invoiceSummarySchema.extend({
  transactions: z.array(transactionSchema),
  payments: z.array(invoicePaymentSchema),
});
export type InvoiceDetail = z.infer<typeof invoiceDetailSchema>;

/** Pagamento total ou parcial. Não existe rotativo: o que faltar fica nesta fatura. */
export const createInvoicePaymentSchema = z.object({
  accountId: idSchema,
  amount: positiveCentsSchema,
  date: isoDateSchema,
});
export type CreateInvoicePaymentInput = z.infer<typeof createInvoicePaymentSchema>;
