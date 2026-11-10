import { describe, expect, it } from 'vitest';

import {
  createCardPurchaseSchema,
  createCreditCardSchema,
  createInvoicePaymentSchema,
  listInvoicesQuerySchema,
  updateCardPurchaseSchema,
} from './index';

const uuid = '0b6f5c43-6d1a-4b8e-9a51-2f3c1f6d9e10';

describe('createCreditCardSchema', () => {
  const valid = { name: ' Nubank ', limit: 500000, closingDay: 3, dueDay: 10, color: '#8B5CF6' };

  it('aceita um cartão válido e normaliza o nome', () => {
    expect(createCreditCardSchema.parse(valid)).toEqual({ ...valid, name: 'Nubank' });
  });

  it.each([
    ['dia 0', { closingDay: 0 }],
    ['dia 32', { dueDay: 32 }],
    ['dia fracionado', { closingDay: 2.5 }],
    ['limite negativo', { limit: -1 }],
    ['cor inválida', { color: 'roxo' }],
  ])('rejeita %s', (_label, overrides) => {
    expect(createCreditCardSchema.safeParse({ ...valid, ...overrides }).success).toBe(false);
  });
});

describe('createCardPurchaseSchema', () => {
  const valid = { amount: 120000, date: '2026-11-09', categoryId: uuid };

  it('usa 1 parcela por padrão e converte descrição vazia em null', () => {
    expect(createCardPurchaseSchema.parse({ ...valid, description: ' ' })).toEqual({
      ...valid,
      installments: 1,
      description: null,
    });
  });

  it('limita o número de parcelas', () => {
    expect(createCardPurchaseSchema.safeParse({ ...valid, installments: 24 }).success).toBe(true);
    expect(createCardPurchaseSchema.safeParse({ ...valid, installments: 25 }).success).toBe(false);
    expect(createCardPurchaseSchema.safeParse({ ...valid, installments: 0 }).success).toBe(false);
  });

  it('não deixa parcelar um valor menor que o número de parcelas', () => {
    const result = createCardPurchaseSchema.safeParse({ ...valid, amount: 2, installments: 3 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['installments']);
  });

  it('só permite editar categoria e descrição', () => {
    expect(updateCardPurchaseSchema.parse({ amount: 1, description: 'Mercado' })).toEqual({
      description: 'Mercado',
    });
  });
});

describe('listInvoicesQuerySchema', () => {
  it('aceita intervalos válidos', () => {
    expect(listInvoicesQuerySchema.parse({})).toEqual({});
    expect(listInvoicesQuerySchema.parse({ from: '2026-01', to: '2026-12' })).toEqual({
      from: '2026-01',
      to: '2026-12',
    });
  });

  it('rejeita intervalo invertido ou longo demais', () => {
    expect(listInvoicesQuerySchema.safeParse({ from: '2026-12', to: '2026-01' }).success).toBe(
      false,
    );
    expect(listInvoicesQuerySchema.safeParse({ from: '2024-01', to: '2027-01' }).success).toBe(
      false,
    );
  });
});

describe('createInvoicePaymentSchema', () => {
  it('exige valor positivo', () => {
    const base = { accountId: uuid, date: '2026-12-10' };
    expect(createInvoicePaymentSchema.safeParse({ ...base, amount: 5000 }).success).toBe(true);
    expect(createInvoicePaymentSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });
});
