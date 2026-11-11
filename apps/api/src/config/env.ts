import { z } from 'zod';

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Variáveis de ambiente da API, validadas na inicialização.
 * Se algo estiver faltando ou inválido, a API não sobe e mostra o motivo.
 * Documentação de cada variável: `.env.example` na raiz.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: z.stringbool().default(false),
  SWAGGER_ENABLED: z.stringbool().default(true),
  RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, { message: 'use pelo menos 32 caracteres aleatórios (ex.: openssl rand -base64 48)' }),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /** Padrão: `true` em produção. Em `http://localhost` pode ficar `false`. */
  COOKIE_SECURE: z.stringbool().optional(),
  /** `lax` quando front e API compartilham o domínio; `none` quando estão em domínios diferentes. */
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  /** Fuso usado para saber "que dia é hoje" (fatura atual, vencimentos). */
  APP_TIMEZONE: z
    .string()
    .default('America/Sao_Paulo')
    .refine(isValidTimeZone, { message: 'fuso horário IANA inválido (ex.: America/Sao_Paulo)' }),
});

/** Valor de exemplo do `.env.example`: não pode ir para produção. */
export const EXAMPLE_JWT_SECRET = 'troque-este-segredo-por-um-valor-aleatorio-e-longo';

const refinedEnvSchema = envSchema
  .refine((env) => env.NODE_ENV !== 'production' || env.JWT_ACCESS_SECRET !== EXAMPLE_JWT_SECRET, {
    message: 'defina um segredo próprio em produção',
    path: ['JWT_ACCESS_SECRET'],
  })
  .transform((env) => ({
    ...env,
    COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
  }))
  .refine((env) => env.COOKIE_SAMESITE !== 'none' || env.COOKIE_SECURE, {
    message: 'SameSite=None exige COOKIE_SECURE=true',
    path: ['COOKIE_SAMESITE'],
  });

export type Env = z.output<typeof refinedEnvSchema>;

export const ENV = Symbol('ENV');

export class InvalidEnvError extends Error {
  constructor(issues: string[]) {
    super(`Variáveis de ambiente inválidas:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'InvalidEnvError';
  }
}

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = refinedEnvSchema.safeParse(source);
  if (!result.success) {
    throw new InvalidEnvError(
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  return result.data;
}
