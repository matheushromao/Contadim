import { z } from 'zod';

import { emailSchema, passwordSchema, userNameSchema, userSchema } from './users';

export const registerSchema = z.object({
  name: userNameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Informe sua senha' }).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Resposta de cadastro, login e refresh. O refresh token vai em cookie httpOnly. */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  /** Validade do access token, em segundos. */
  expiresIn: z.number().int(),
  user: userSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

/** Header exigido no `/auth/refresh` como proteção contra CSRF. */
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_HEADER_VALUE = 'contadim';
