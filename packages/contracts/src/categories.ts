import { z } from 'zod';

import {
  dateTimeSchema,
  entryTypeSchema,
  idSchema,
  paginatedSchema,
  paginationQuerySchema,
} from './common';

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, { message: 'Cor inválida (use #RRGGBB)' });

export const categorySchema = z.object({
  id: idSchema,
  name: z.string(),
  type: entryTypeSchema,
  color: z.string(),
  icon: z.string(),
  isDefault: z.boolean(),
  archivedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Category = z.infer<typeof categorySchema>;

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Dê um nome para a categoria' })
    .max(40, { message: 'Nome muito longo' }),
  type: entryTypeSchema,
  color: hexColorSchema,
  icon: z.string().trim().min(1).max(40),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/** O tipo não pode ser alterado depois da criação, para não deixar lançamentos inconsistentes. */
export const updateCategorySchema = createCategorySchema.omit({ type: true }).partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const listCategoriesQuerySchema = paginationQuerySchema.extend({
  type: entryTypeSchema.optional(),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

export const categoryListSchema = paginatedSchema(categorySchema);
