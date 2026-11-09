import { type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

import { ValidationError } from '../errors/app-error.js';

export interface ValidationIssue {
  path: string;
  message: string;
}

/**
 * Valida (e normaliza) a entrada com um schema Zod de `@contadim/contracts`.
 * Uso: `@Body(new ZodValidationPipe(createAccountSchema)) body: CreateAccountInput`.
 */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError(issues);
    }
    return result.data;
  }
}
