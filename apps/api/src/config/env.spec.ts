import { describe, expect, it } from 'vitest';

import { InvalidEnvError, parseEnv } from './env.js';

const base = { DATABASE_URL: 'postgresql://user:pass@localhost:5432/db' };

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
});
