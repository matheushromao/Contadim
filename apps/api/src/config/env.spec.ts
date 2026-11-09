import { describe, expect, it } from 'vitest';

import { EXAMPLE_JWT_SECRET, InvalidEnvError, parseEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('parseEnv', () => {
  it('aplica valores padrão', () => {
    const env = parseEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173']);
    expect(env.TRUST_PROXY).toBe(false);
  });

  it('converte listas e booleanos', () => {
    const env = parseEnv({
      ...base,
      CORS_ORIGINS: 'https://a.com, https://b.com',
      TRUST_PROXY: 'true',
      PORT: '8080',
    });
    expect(env.CORS_ORIGINS).toEqual(['https://a.com', 'https://b.com']);
    expect(env.TRUST_PROXY).toBe(true);
    expect(env.PORT).toBe(8080);
  });

  it('explica o que está errado', () => {
    expect(() => parseEnv({ DATABASE_URL: 'mysql://x' })).toThrow(InvalidEnvError);
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('exige segredo JWT forte', () => {
    expect(() => parseEnv({ ...base, JWT_ACCESS_SECRET: 'curto' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('não aceita o segredo de exemplo em produção', () => {
    const env = { ...base, JWT_ACCESS_SECRET: EXAMPLE_JWT_SECRET };
    expect(() => parseEnv(env)).not.toThrow();
    expect(() => parseEnv({ ...env, NODE_ENV: 'production' })).toThrow(/segredo próprio/);
  });

  it('usa cookie seguro por padrão apenas em produção', () => {
    expect(parseEnv(base).COOKIE_SECURE).toBe(false);
    expect(parseEnv({ ...base, NODE_ENV: 'production' }).COOKIE_SECURE).toBe(true);
    expect(parseEnv({ ...base, COOKIE_SECURE: 'true' }).COOKIE_SECURE).toBe(true);
  });

  it('exige cookie seguro com SameSite=None', () => {
    expect(() => parseEnv({ ...base, COOKIE_SAMESITE: 'none' })).toThrow(/COOKIE_SECURE/);
  });
});
