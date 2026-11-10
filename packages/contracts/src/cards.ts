import { INVOICE_STATUSES } from '@contadim/core';
import { z } from 'zod';

import { hexColorSchema } from './categories';
import {
  centsSchema,
  dateTimeSchema,
  idSchema,
  isoDateSchema,
  paginatedSchema,
  paginationQuerySchema,
  yearMonthSchema,
} from './common';

export const dayOfMonthSchema = z
  .number({ message: 'Informe um dia' })
  .int({ message: 'Informe um dia entre 1 e 31' })
  .min(1, { message: 'Informe um dia entre 1 e 31' })
  .max(31, { message: 'Informe um dia entre 1 e 31' });

export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);

/** Resumo de uma fatura (usado no cartão, na listagem de faturas e no detalhe). */
export const invoiceSummarySchema = z.object({
  cardId: idSchema,
  /** Mês de vencimento, que identifica a fatura. */
  month: yearMonthSchema,
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  closingDate: isoDateSchema,
  dueDate: isoDateSchema,
  total: centsSchema,
  paid: centsSchema,
  remaining: centsSchema,
  status: invoiceStatusSchema,
});
export type InvoiceSummary = z.infer<typeof invoiceSummarySchema>;

export const creditCardSchema = z.object({
  id: idSchema,
  name: z.string(),
  limit: centsSchema,
  closingDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  color: z.string(),
  /** Limite menos tudo o que está em aberto (inclui parcelas futuras). Pode ser negativo. */
  availableLimit: centsSchema,
  /** Fatura que está recebendo compras hoje. */
  currentInvoice: invoiceSummarySchema,
  archivedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type CreditCard = z.infer<typeof creditCardSchema>;

export const createCreditCardSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Dê um nome para o cartão' })
    .max(40, { message: 'Nome muito longo' }),
  limit: centsSchema.refine((value) => value >= 0, { message: 'O limite não pode ser negativo' }),
  closingDay: dayOfMonthSchema,
  dueDay: dayOfMonthSchema,
  color: hexColorSchema,
});
export type CreateCreditCardInput = z.infer<typeof createCreditCardSchema>;

/** Mudar fechamento/vencimento vale só para compras novas (as antigas mantêm a fatura). */
export const updateCreditCardSchema = createCreditCardSchema.partial();
export type UpdateCreditCardInput = z.infer<typeof updateCreditCardSchema>;

export const listCreditCardsQuerySchema = paginationQuerySchema;
export type ListCreditCardsQuery = z.infer<typeof listCreditCardsQuerySchema>;

export const creditCardListSchema = paginatedSchema(creditCardSchema);
