import { describe, expect, it } from 'vitest';

import {
  createAccountSchema,
  createCategorySchema,
  createTransactionSchema,
  listTransactionsQuerySchema,
  MAX_CENTS,
  paginationQuerySchema,
  registerSchema,
  updateCategorySchema,
} from './index';

const uuid = '0b6f5c43-6d1a-4b8e-9a51-2f3c1f6d9e10';

describe('registerSchema', () => {
  it('normaliza e-mail e nome', () => {
    const result = registerSchema.parse({
      name: '  Maria  ',
      email: '  Maria@Exemplo.COM ',
      password: '12345678',
    });
    expect(result).toEqual({ name: 'Maria', email: 'maria@exemplo.com', password: '12345678' });
  });

  it('rejeita senha curta e e-mail inválido', () => {
    const result = registerSchema.safeParse({ name: 'A', email: 'x', password: '123' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['email', 'password']);
  });
});

describe('paginationQuerySchema', () => {
  it('aplica padrões e converte strings da query', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationQuerySchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it('limita o tamanho da página', () => {
    expect(paginationQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });
});

describe('createAccountSchema', () => {
  it('usa saldo inicial zero por padrão', () => {
    expect(createAccountSchema.parse({ name: 'Nubank', type: 'CHECKING' })).toEqual({
      name: 'Nubank',
      type: 'CHECKING',
      initialBalance: 0,
    });
  });

  it('aceita saldo negativo, mas não float', () => {
    expect(
      createAccountSchema.safeParse({ name: 'C', type: 'CHECKING', initialBalance: -100 }).success,
    ).toBe(true);
    expect(
      createAccountSchema.safeParse({ name: 'C', type: 'CHECKING', initialBalance: 1.5 }).success,
    ).toBe(false);
  });
});

describe('category schemas', () => {
  it('valida cor hexadecimal', () => {
    const base = { name: 'Pets', type: 'EXPENSE', icon: 'dog' };
    expect(createCategorySchema.safeParse({ ...base, color: '#AABBCC' }).success).toBe(true);
    expect(createCategorySchema.safeParse({ ...base, color: 'red' }).success).toBe(false);
  });

  it('não permite alterar o tipo', () => {
    expect(updateCategorySchema.parse({ name: 'Pet', type: 'INCOME' })).toEqual({ name: 'Pet' });
  });
});

describe('createTransactionSchema', () => {
  const valid = {
    amount: 1250,
    type: 'EXPENSE',
    date: '2026-11-09',
    categoryId: uuid,
    accountId: uuid,
  };

  it('aceita lançamento sem descrição', () => {
    expect(createTransactionSchema.parse(valid)).toEqual(valid);
  });

  it('converte descrição vazia em null', () => {
    expect(createTransactionSchema.parse({ ...valid, description: '   ' }).description).toBeNull();
  });

  it.each([0, -10, 12.5, MAX_CENTS + 1])('rejeita valor %s', (amount) => {
    expect(createTransactionSchema.safeParse({ ...valid, amount }).success).toBe(false);
  });

  it('rejeita data inválida', () => {
    expect(createTransactionSchema.safeParse({ ...valid, date: '2026-02-30' }).success).toBe(false);
  });
});

describe('listTransactionsQuerySchema', () => {
  it('aceita filtro por mês', () => {
    expect(listTransactionsQuerySchema.parse({ month: '2026-11' })).toMatchObject({
      month: '2026-11',
      page: 1,
    });
  });

  it('rejeita mês junto com intervalo', () => {
    expect(
      listTransactionsQuerySchema.safeParse({ month: '2026-11', from: '2026-11-01' }).success,
    ).toBe(false);
  });

  it('rejeita intervalo invertido', () => {
    expect(
      listTransactionsQuerySchema.safeParse({ from: '2026-11-30', to: '2026-11-01' }).success,
    ).toBe(false);
  });
});
