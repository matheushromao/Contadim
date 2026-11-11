import { z } from 'zod';

import { accountSchema } from './accounts';
import { creditCardSchema } from './cards';
import { categorySchema } from './categories';
import { dateTimeSchema } from './common';
import { invoicePaymentSchema } from './invoices';
import { transactionSchema } from './transactions';
import { userSchema } from './users';

/** Exportação completa dos dados de uma pessoa (LGPD, direito de portabilidade). */
export const userDataExportSchema = z.object({
  exportedAt: dateTimeSchema,
  /** v2: inclui cartões de crédito e pagamentos de fatura. */
  version: z.literal(2),
  user: userSchema,
  accounts: z.array(accountSchema.omit({ currentBalance: true })),
  categories: z.array(categorySchema),
  transactions: z.array(transactionSchema),
  creditCards: z.array(creditCardSchema.omit({ availableLimit: true, currentInvoice: true })),
  invoicePayments: z.array(invoicePaymentSchema),
});
export type UserDataExport = z.infer<typeof userDataExportSchema>;
