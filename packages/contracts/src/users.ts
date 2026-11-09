import { z } from 'zod';

import { dateTimeSchema, idSchema } from './common';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'E-mail inválido' }).max(254));

export const passwordSchema = z
  .string()
  .min(8, { message: 'A senha precisa ter pelo menos 8 caracteres' })
  .max(128, { message: 'A senha pode ter no máximo 128 caracteres' });

export const userNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Informe seu nome' })
  .max(80, { message: 'Nome muito longo' });

export const userSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string(),
  createdAt: dateTimeSchema,
});
export type User = z.infer<typeof userSchema>;

/** Exclusão de conta (LGPD): exige a senha atual como confirmação. */
export const deleteMeSchema = z.object({
  password: z.string().min(1, { message: 'Informe sua senha' }),
});
export type DeleteMeInput = z.infer<typeof deleteMeSchema>;
