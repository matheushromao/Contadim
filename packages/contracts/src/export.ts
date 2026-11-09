import { z } from 'zod';

import { accountSchema } from './accounts';
import { categorySchema } from './categories';
import { dateTimeSchema } from './common';
import { transactionSchema } from './transactions';
import { userSchema } from './users';

/** Exportação completa dos dados de uma pessoa (LGPD, direito de portabilidade). */
export const userDataExportSchema = z.object({
  exportedAt: dateTimeSchema,
  version: z.literal(1),
  user: userSchema,
  accounts: z.array(accountSchema.omit({ currentBalance: true })),
  categories: z.array(categorySchema),
  transactions: z.array(transactionSchema),
});
export type UserDataExport = z.infer<typeof userDataExportSchema>;
