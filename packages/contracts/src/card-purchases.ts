import { MAX_INSTALLMENTS } from '@contadim/core';
import { z } from 'zod';

import { idSchema, isoDateSchema, positiveCentsSchema } from './common';
import { transactionSchema } from './transactions';

const descriptionSchema = z
  .string()
  .trim()
  .max(140, { message: 'Descrição muito longa' })
  .transform((value) => (value === '' ? null : value));

export const installmentsSchema = z
  .number({ message: 'Informe o número de parcelas' })
  .int()
  .min(1, { message: 'Mínimo de 1 parcela' })
  .max(MAX_INSTALLMENTS, { message: `Máximo de ${MAX_INSTALLMENTS} parcelas` });

/**
 * Compra no cartão. `amount` é o **valor total**: a API divide nas parcelas
 * (centavos que sobram vão na 1ª) e distribui pelas faturas seguintes.
 */
export const createCardPurchaseSchema = z
  .object({
    amount: positiveCentsSchema,
    installments: installmentsSchema.default(1),
    date: isoDateSchema,
    categoryId: idSchema,
    description: descriptionSchema.nullish(),
  })
  .refine((input) => input.amount >= input.installments, {
    message: 'O valor é pequeno demais para esse número de parcelas',
    path: ['installments'],
  });
export type CreateCardPurchaseInput = z.input<typeof createCardPurchaseSchema>;
export type CreateCardPurchaseData = z.output<typeof createCardPurchaseSchema>;

/** Valor, data e parcelas não mudam: para isso, exclua e lance de novo. */
export const updateCardPurchaseSchema = z.object({
  categoryId: idSchema.optional(),
  description: descriptionSchema.nullish(),
});
export type UpdateCardPurchaseInput = z.input<typeof updateCardPurchaseSchema>;
export type UpdateCardPurchaseData = z.output<typeof updateCardPurchaseSchema>;

/** Uma compra (parcelada ou não) com todas as suas parcelas. */
export const cardPurchaseSchema = z.object({
  groupId: idSchema,
  cardId: idSchema,
  categoryId: idSchema,
  description: z.string().nullable(),
  date: isoDateSchema,
  totalAmount: positiveCentsSchema,
  installmentTotal: installmentsSchema,
  installments: z.array(transactionSchema),
});
export type CardPurchase = z.infer<typeof cardPurchaseSchema>;
