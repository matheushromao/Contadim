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
  accountId: idSchema.nullable(),
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

/** Filtros da listagem. Use `month` OU o intervalo `from`/`to`. */
export const listTransactionsQuerySchema = paginationQuerySchema
  .extend({
    month: yearMonthSchema.optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    type: entryTypeSchema.optional(),
    categoryId: idSchema.optional(),
    accountId: idSchema.optional(),
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
