import { z } from 'zod';

import { centsSchema, idSchema, yearMonthSchema } from './common';

export const monthlySummaryQuerySchema = z.object({
  month: yearMonthSchema,
});
export type MonthlySummaryQuery = z.infer<typeof monthlySummaryQuerySchema>;

export const summaryCategoryItemSchema = z.object({
  category: z.object({
    id: idSchema,
    name: z.string(),
    color: z.string(),
    icon: z.string(),
  }),
  total: centsSchema,
  /** Percentual sobre o total do tipo, com uma casa decimal. */
  percent: z.number(),
});
export type SummaryCategoryItem = z.infer<typeof summaryCategoryItemSchema>;

export const monthlySummarySchema = z.object({
  month: yearMonthSchema,
  totalIncome: centsSchema,
  totalExpense: centsSchema,
  balance: centsSchema,
  expensesByCategory: z.array(summaryCategoryItemSchema),
  incomesByCategory: z.array(summaryCategoryItemSchema),
});
export type MonthlySummary = z.infer<typeof monthlySummarySchema>;
