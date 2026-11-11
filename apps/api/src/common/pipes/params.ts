import { idSchema, yearMonthSchema } from '@contadim/contracts';
import { Body, Param, Query } from '@nestjs/common';
import type { z } from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe.js';

/** `:id` validado como UUID (resposta 400 padronizada se inválido). */
export const IdParam = () => Param('id', new ZodValidationPipe(idSchema));

/** Outro parâmetro de rota que é um UUID (ex.: `:groupId`, `:paymentId`). */
export const UuidParam = (name: string) => Param(name, new ZodValidationPipe(idSchema));

/** `:month` no formato `YYYY-MM`. */
export const MonthParam = () => Param('month', new ZodValidationPipe(yearMonthSchema));

/** Corpo validado com um schema de `@contadim/contracts`. */
export const ZodBody = (schema: z.ZodType) => Body(new ZodValidationPipe(schema));

/** Query string validada com um schema de `@contadim/contracts`. */
export const ZodQuery = (schema: z.ZodType) => Query(new ZodValidationPipe(schema));
