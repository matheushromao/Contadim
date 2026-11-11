import { z } from 'zod';

import { accountSchema } from './accounts';
import { creditCardSchema } from './cards';
import { categorySchema } from './categories';
import { dateTimeSchema } from './common';
import { goalMovementSchema, goalSchema } from './goals';
import { invoicePaymentSchema } from './invoices';
import { transactionSchema } from './transactions';
import { userSchema } from './users';

/** Exportação completa dos dados de uma pessoa (LGPD, direito de portabilidade). */
export const userDataExportSchema = z.object({
  exportedAt: dateTimeSchema,
  /** v2: cartões de crédito e pagamentos de fatura. v3: metas e movimentações. */
  version: z.literal(3),
  user: userSchema,
  accounts: z.array(accountSchema.omit({ currentBalance: true })),
  categories: z.array(categorySchema),
  transactions: z.array(transactionSchema),
  creditCards: z.array(creditCardSchema.omit({ availableLimit: true, currentInvoice: true })),
  invoicePayments: z.array(invoicePaymentSchema),
  goals: z.array(
    goalSchema.pick({
      id: true,
      name: true,
      targetAmount: true,
      deadline: true,
      color: true,
      icon: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
    }),
  ),
  goalMovements: z.array(goalMovementSchema),
});
export type UserDataExport = z.infer<typeof userDataExportSchema>;
