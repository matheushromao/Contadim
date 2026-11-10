import { z } from 'zod';

import {
  dateTimeSchema,
  entryTypeSchema,
  idSchema,
  isoDateSchema,
  paginatedSchema,
  paginationQuerySchema,
  positiveCentsSchema,
  yearMonthSchema,
} from './common';

export const transactionSchema = z.object({
  id: idSchema,
  description: z.string().nullable(),
  /** Sempre positivo, em centavos. O sinal vem do `type`. */
  amount: positiveCentsSchema,
  type: entryTypeSchema,
  date: isoDateSchema,
  categoryId: idSchema,
  /** Exatamente um entre `accountId` e `cardId` vem preenchido. */
  accountId: idSchema.nullable(),
  cardId: idSchema.nullable(),
  /** Fatura em que a parcela é cobrada (apenas compras no cartão). */
  invoiceMonth: yearMonthSchema.nullable(),
  installmentGroupId: idSchema.nullable(),
  /** Parcela atual e total (ex.: 3 de 12). Compras à vista no cartão são 1 de 1. */
  installmentNumber: z.number().int().positive().nullable(),
  installmentTotal: z.number().int().positive().nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Transaction = z.infer<typeof transactionSchema>;

const descriptionSchema = z
  .string()
  .trim()
  .max(140, { message: 'Descrição muito longa' })
  .transform((value) => (value === '' ? null : value));

/**
 * Criação de lançamento. Para o lançamento rápido, apenas valor e categoria
 * dependem da pessoa: tipo, data e conta são pré-preenchidos pelo front.
 */
export const createTransactionSchema = z.object({
  amount: positiveCentsSchema,
  type: entryTypeSchema,
  date: isoDateSchema,
  categoryId: idSchema,
  accountId: idSchema,
  description: descriptionSchema.nullish(),
});
export type CreateTransactionInput = z.input<typeof createTransactionSchema>;
export type CreateTransactionData = z.output<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.partial();
export type UpdateTransactionInput = z.input<typeof updateTransactionSchema>;
export type UpdateTransactionData = z.output<typeof updateTransactionSchema>;

/**
 * Filtros da listagem. Use `month` OU o intervalo `from`/`to`.
 * Com `month`, compras no cartão entram pelo mês da fatura, e não pela data da compra.
 */
export const listTransactionsQuerySchema = paginationQuerySchema
  .extend({
    month: yearMonthSchema.optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    type: entryTypeSchema.optional(),
    categoryId: idSchema.optional(),
    accountId: idSchema.optional(),
    cardId: idSchema.optional(),
  })
  .refine((query) => !(query.month && (query.from || query.to)), {
    message: 'Use "month" ou "from"/"to", não os dois',
    path: ['month'],
  })
  .refine((query) => !(query.from && query.to && query.from > query.to), {
    message: '"from" deve ser anterior ou igual a "to"',
    path: ['from'],
  });
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

export const transactionListSchema = paginatedSchema(transactionSchema);
