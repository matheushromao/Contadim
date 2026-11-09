import { idSchema } from '@contadim/contracts';
import { Body, Param, Query } from '@nestjs/common';
import type { z } from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe.js';

/** `:id` validado como UUID (resposta 400 padronizada se inválido). */
export const IdParam = () => Param('id', new ZodValidationPipe(idSchema));

/** Corpo validado com um schema de `@contadim/contracts`. */
export const ZodBody = (schema: z.ZodType) => Body(new ZodValidationPipe(schema));

/** Query string validada com um schema de `@contadim/contracts`. */
export const ZodQuery = (schema: z.ZodType) => Query(new ZodValidationPipe(schema));
