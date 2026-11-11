import { describe, expect, it } from 'vitest';

import { createGoalMovementSchema, createGoalSchema, updateGoalSchema } from './index';

const uuid = '0b6f5c43-6d1a-4b8e-9a51-2f3c1f6d9e10';

describe('createGoalSchema', () => {
  const valid = { name: ' Viagem ', targetAmount: 200000, color: '#0EA5E9', icon: 'plane' };

  it('aceita meta sem prazo e normaliza o nome', () => {
    expect(createGoalSchema.parse(valid)).toEqual({ ...valid, name: 'Viagem' });
  });

  it('trata prazo vazio do formulário como "sem prazo"', () => {
    expect(createGoalSchema.parse({ ...valid, deadline: '' }).deadline).toBeNull();
    expect(createGoalSchema.parse({ ...valid, deadline: '2027-03-31' }).deadline).toBe(
      '2027-03-31',
    );
  });

  it.each([
    ['valor-alvo zero', { targetAmount: 0 }],
    ['valor-alvo fracionado', { targetAmount: 10.5 }],
    ['prazo inválido', { deadline: '2027-02-30' }],
    ['sem nome', { name: '  ' }],
    ['cor inválida', { color: 'azul' }],
  ])('rejeita %s', (_label, overrides) => {
    expect(createGoalSchema.safeParse({ ...valid, ...overrides }).success).toBe(false);
  });

  it('permite tirar o prazo na edição', () => {
    expect(updateGoalSchema.parse({ deadline: null })).toEqual({ deadline: null });
  });
});

describe('createGoalMovementSchema', () => {
  const valid = { type: 'DEPOSIT', accountId: uuid, amount: 30000, date: '2026-11-11' };

  it('aceita depósito e resgate, com observação opcional', () => {
    expect(createGoalMovementSchema.parse(valid)).toEqual(valid);
    expect(
      createGoalMovementSchema.parse({ ...valid, type: 'WITHDRAWAL', note: ' ' }).note,
    ).toBeNull();
  });

  it('exige valor positivo e tipo válido', () => {
    expect(createGoalMovementSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(createGoalMovementSchema.safeParse({ ...valid, type: 'TRANSFER' }).success).toBe(false);
  });
});
