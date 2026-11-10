import { describe, expect, it } from 'vitest';

import { installmentSchedule, MAX_INSTALLMENTS, splitInstallments } from './installments';

describe('splitInstallments', () => {
  it('divide em partes iguais', () => {
    expect(splitInstallments(120000, 12)).toEqual(Array(12).fill(10000));
  });

  it('coloca os centavos que sobram na primeira parcela', () => {
    expect(splitInstallments(1000, 3)).toEqual([334, 333, 333]);
    expect(splitInstallments(10001, 2)).toEqual([5001, 5000]);
  });

  it('a soma é sempre exatamente o total', () => {
    for (const total of [1, 99, 1000, 12345, 999999]) {
      for (let n = 1; n <= MAX_INSTALLMENTS && n <= total; n += 1) {
        expect(splitInstallments(total, n).reduce((a, b) => a + b, 0)).toBe(total);
      }
    }
  });

  it('rejeita entradas inválidas', () => {
    expect(() => splitInstallments(1000, 0)).toThrow(RangeError);
    expect(() => splitInstallments(1000, MAX_INSTALLMENTS + 1)).toThrow(RangeError);
    expect(() => splitInstallments(1000, 1.5)).toThrow(RangeError);
    expect(() => splitInstallments(2, 3)).toThrow(/pequeno demais/);
  });
});

describe('installmentSchedule', () => {
  const cycle = { closingDay: 3, dueDay: 10 };

  it('distribui as parcelas nas faturas seguintes, atravessando o ano', () => {
    const schedule = installmentSchedule({
      purchaseDate: '2026-11-15',
      totalCents: 30000,
      installments: 3,
      cycle,
    });
    expect(schedule).toEqual([
      { number: 1, amount: 10000, invoiceMonth: '2026-12' },
      { number: 2, amount: 10000, invoiceMonth: '2027-01' },
      { number: 3, amount: 10000, invoiceMonth: '2027-02' },
    ]);
  });

  it('compra no dia do fechamento começa na fatura seguinte', () => {
    const [first] = installmentSchedule({
      purchaseDate: '2026-12-03',
      totalCents: 120000,
      installments: 12,
      cycle,
    });
    expect(first).toEqual({ number: 1, amount: 10000, invoiceMonth: '2027-01' });
  });

  it('à vista gera uma única parcela', () => {
    expect(
      installmentSchedule({ purchaseDate: '2026-11-09', totalCents: 4590, installments: 1, cycle }),
    ).toEqual([{ number: 1, amount: 4590, invoiceMonth: '2026-12' }]);
  });
});
