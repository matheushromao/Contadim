import { errorResponseSchema } from '@contadim/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiQuery, ApiResponse, type SchemaObject } from '@nestjs/swagger';
import { z } from 'zod';

/** Converte um schema Zod em JSON Schema compatível com OpenAPI 3.0. */
export function toOpenApi(schema: z.ZodType, io: 'input' | 'output' = 'output'): SchemaObject {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io,
    unrepresentable: 'any',
  }) as Record<string, unknown>;
  return json;
}

/** Documenta o corpo da requisição a partir do schema Zod. */
export const ApiZodBody = (schema: z.ZodType) => ApiBody({ schema: toOpenApi(schema, 'input') });

/** Documenta cada parâmetro de query a partir de um `z.object`. */
export function ApiZodQuery(schema: z.ZodType) {
  const json = toOpenApi(schema, 'input');
  const required = new Set(json.required ?? []);
  return applyDecorators(
    ...Object.entries(json.properties ?? {}).map(([name, property]) =>
      ApiQuery({ name, required: required.has(name), schema: property as SchemaObject }),
    ),
  );
}

/** Documenta uma resposta de sucesso a partir do schema Zod. */
export const ApiZodResponse = (status: number, schema: z.ZodType, description?: string) =>
  ApiResponse({ status, schema: toOpenApi(schema), description: description ?? '' });

/** Documenta respostas de erro no formato padrão. */
export const ApiErrorResponses = (...statuses: number[]) =>
  applyDecorators(
    ...statuses.map((status) => ApiResponse({ status, schema: toOpenApi(errorResponseSchema) })),
  );
