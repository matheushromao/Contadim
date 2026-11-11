import { describe, expect, it } from 'vitest';

import { InvalidMoneyError } from '../money/money';
import { goalBalance, goalProgress, savingPlan } from './goals';

describe('goalBalance', () => {
  it('soma depósitos e subtrai resgates', () => {
    expect(
      goalBalance([
        { type: 'DEPOSIT', amount: 30000 },
        { type: 'DEPOSIT', amount: 20000 },
        { type: 'WITHDRAWAL', amount: 10000 },
      ]),
    ).toBe(40000);
    expect(goalBalance([])).toBe(0);
  });
});

describe('goalProgress', () => {
  it('calcula quanto falta e o percentual com uma casa', () => {
    expect(goalProgress({ target: 200000, saved: 80000 })).toEqual({
      remaining: 120000,
      percent: 40,
      achieved: false,
    });
    expect(goalProgress({ target: 300000, saved: 100000 }).percent).toBe(33.3);
  });

  it('limita o percentual a 100 e o restante a zero', () => {
    expect(goalProgress({ target: 100000, saved: 150000 })).toEqual({
      remaining: 0,
      percent: 100,
      achieved: true,
    });
  });

  it('rejeita alvo inválido', () => {
    expect(() => goalProgress({ target: 0, saved: 0 })).toThrow(RangeError);
    expect(() => goalProgress({ target: 1.5, saved: 0 })).toThrow(InvalidMoneyError);
  });
});

describe('savingPlan', () => {
  const base = { target: 200000, saved: 80000, today: '2026-11-11', savedThisMonth: 0 };

  it('inclui o mês atual quando ainda não houve depósito nele', () => {
    // Falta R$ 1.200 até março: novembro, dezembro, janeiro, fevereiro e março.
    expect(savingPlan({ ...base, deadline: '2027-03-31' })).toEqual({
      status: 'IN_PROGRESS',
      monthsLeft: 5,
      monthlyAmount: 24000,
    });
  });

  it('começa no mês seguinte quando já guardou neste mês', () => {
    expect(savingPlan({ ...base, deadline: '2027-03-31', savedThisMonth: 5000 })).toEqual({
      status: 'IN_PROGRESS',
      monthsLeft: 4,
      monthlyAmount: 30000,
    });
  });

  it('arredonda para cima no centavo', () => {
    // Faltam R$ 1.000,00 em 3 meses: 333,34 por mês (a soma cobre o que falta).
    const plan = savingPlan({ ...base, saved: 100000, deadline: '2027-01-15' });
    expect(plan).toEqual({ status: 'IN_PROGRESS', monthsLeft: 3, monthlyAmount: 33334 });
    expect(plan.monthlyAmount! * plan.monthsLeft!).toBeGreaterThanOrEqual(100000);
  });

  it('prazo neste mês: o que falta é para agora', () => {
    expect(savingPlan({ ...base, deadline: '2026-11-30' })).toMatchObject({
      monthsLeft: 1,
      monthlyAmount: 120000,
    });
    expect(savingPlan({ ...base, deadline: '2026-11-30', savedThisMonth: 1 })).toMatchObject({
      monthsLeft: 1,
      monthlyAmount: 120000,
    });
  });

  it('o próprio dia do prazo ainda está em andamento', () => {
    expect(savingPlan({ ...base, deadline: '2026-11-11' }).status).toBe('IN_PROGRESS');
  });

  it('marca prazo vencido', () => {
    expect(savingPlan({ ...base, deadline: '2026-11-10' })).toEqual({
      status: 'OVERDUE',
      monthsLeft: 0,
      monthlyAmount: 120000,
    });
  });

  it('meta atingida não pede mais nada, mesmo depois do prazo', () => {
    expect(savingPlan({ ...base, saved: 200000, deadline: '2026-01-01' })).toEqual({
      status: 'ACHIEVED',
      monthsLeft: 0,
      monthlyAmount: 0,
    });
  });

  it('sem prazo, só acompanha o progresso', () => {
    expect(savingPlan({ ...base, deadline: null })).toEqual({
      status: 'NO_DEADLINE',
      monthsLeft: null,
      monthlyAmount: null,
    });
  });
});
