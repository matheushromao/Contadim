import { GOAL_MOVEMENT_TYPES, SAVING_PLAN_STATUSES } from '@contadim/core';
import { z } from 'zod';

import { hexColorSchema } from './categories';
import {
  centsSchema,
  dateTimeSchema,
  idSchema,
  isoDateSchema,
  paginatedSchema,
  paginationQuerySchema,
  positiveCentsSchema,
} from './common';

export const goalMovementTypeSchema = z.enum(GOAL_MOVEMENT_TYPES);
export const savingPlanStatusSchema = z.enum(SAVING_PLAN_STATUSES);

export const goalSchema = z.object({
  id: idSchema,
  name: z.string(),
  targetAmount: positiveCentsSchema,
  deadline: isoDateSchema.nullable(),
  color: z.string(),
  icon: z.string(),
  /** Quanto já está guardado (depósitos − resgates). */
  saved: centsSchema,
  remaining: centsSchema,
  /** Progresso de 0 a 100, com uma casa decimal. */
  percent: z.number(),
  status: savingPlanStatusSchema,
  /** Meses considerados no plano (`null` sem prazo). */
  monthsLeft: z.number().int().nullable(),
  /** Quanto guardar por mês para chegar no prazo (`null` sem prazo). */
  monthlyAmount: centsSchema.nullable(),
  /** Depósitos − resgates feitos no mês atual. */
  savedThisMonth: centsSchema,
  archivedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Goal = z.infer<typeof goalSchema>;

/** Prazo opcional: vazio (formulário) ou `null` significam "sem prazo". */
const optionalDeadlineSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  isoDateSchema.nullish(),
);

export const createGoalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Dê um nome para a meta' })
    .max(40, { message: 'Nome muito longo' }),
  targetAmount: positiveCentsSchema,
  deadline: optionalDeadlineSchema,
  color: hexColorSchema,
  icon: z.string().trim().min(1).max(40),
});
export type CreateGoalInput = z.input<typeof createGoalSchema>;
export type CreateGoalData = z.output<typeof createGoalSchema>;

export const updateGoalSchema = createGoalSchema.partial();
export type UpdateGoalInput = z.input<typeof updateGoalSchema>;
export type UpdateGoalData = z.output<typeof updateGoalSchema>;

export const listGoalsQuerySchema = paginationQuerySchema;
export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>;

export const goalListSchema = paginatedSchema(goalSchema);

export const goalMovementSchema = z.object({
  id: idSchema,
  goalId: idSchema,
  accountId: idSchema,
  type: goalMovementTypeSchema,
  amount: positiveCentsSchema,
  date: isoDateSchema,
  note: z.string().nullable(),
  createdAt: dateTimeSchema,
});
export type GoalMovement = z.infer<typeof goalMovementSchema>;

/** Guardar (DEPOSIT) ou resgatar (WITHDRAWAL). O resgate não pode passar do que está guardado. */
export const createGoalMovementSchema = z.object({
  type: goalMovementTypeSchema,
  accountId: idSchema,
  amount: positiveCentsSchema,
  date: isoDateSchema,
  note: z
    .string()
    .trim()
    .max(140, { message: 'Observação muito longa' })
    .transform((value) => (value === '' ? null : value))
    .nullish(),
});
export type CreateGoalMovementInput = z.input<typeof createGoalMovementSchema>;
export type CreateGoalMovementData = z.output<typeof createGoalMovementSchema>;

export const listGoalMovementsQuerySchema = paginationQuerySchema;
export type ListGoalMovementsQuery = z.infer<typeof listGoalMovementsQuerySchema>;

export const goalMovementListSchema = paginatedSchema(goalMovementSchema);
