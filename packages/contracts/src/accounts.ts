import { z } from 'zod';

import {
  accountTypeSchema,
  centsSchema,
  dateTimeSchema,
  idSchema,
  paginatedSchema,
  paginationQuerySchema,
} from './common';

const accountNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Dê um nome para a conta' })
  .max(60, { message: 'Nome muito longo' });

export const accountSchema = z.object({
  id: idSchema,
  name: z.string(),
  type: accountTypeSchema,
  initialBalance: centsSchema,
  /** Saldo inicial + receitas − despesas, em centavos. */
  currentBalance: centsSchema,
  archivedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Account = z.infer<typeof accountSchema>;

export const createAccountSchema = z.object({
  name: accountNameSchema,
  type: accountTypeSchema,
  initialBalance: centsSchema.default(0),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial();
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const listAccountsQuerySchema = paginationQuerySchema;
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;

export const accountListSchema = paginatedSchema(accountSchema);
