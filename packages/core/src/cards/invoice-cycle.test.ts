import { describe, expect, it } from 'vitest';

import { clampedDate, invoiceDates, invoiceMonthFor } from './invoice-cycle';

const closesOn3DueOn10 = { closingDay: 3, dueDay: 10 };
const closesOn25DueOn5 = { closingDay: 25, dueDay: 5 };
const closesOn31DueOn8 = { closingDay: 31, dueDay: 8 };

describe('clampedDate', () => {
  it('ajusta para o último dia do mês', () => {
    expect(clampedDate('2026-02', 31)).toBe('2026-02-28');
    expect(clampedDate('2024-02', 30)).toBe('2024-02-29');
    expect(clampedDate('2026-04', 31)).toBe('2026-04-30');
    expect(clampedDate('2026-11', 9)).toBe('2026-11-09');
  });
});

describe('invoiceDates', () => {
  it('fecha no mesmo mês quando o fechamento vem antes do vencimento', () => {
    expect(invoiceDates('2026-12', closesOn3DueOn10)).toEqual({
      periodStart: '2026-11-03',
      periodEnd: '2026-12-02',
      closingDate: '2026-12-03',
      dueDate: '2026-12-10',
    });
  });

  it('fecha no mês anterior quando o vencimento vem antes do fechamento', () => {
    expect(invoiceDates('2026-12', closesOn25DueOn5)).toEqual({
      periodStart: '2026-10-25',
      periodEnd: '2026-11-24',
      closingDate: '2026-11-25',
      dueDate: '2026-12-05',
    });
  });

  it('atravessa a virada do ano', () => {
    expect(invoiceDates('2027-01', closesOn25DueOn5)).toMatchObject({
      closingDate: '2026-12-25',
      dueDate: '2027-01-05',
    });
  });

  it('ajusta fechamento no dia 31 em meses curtos', () => {
    expect(invoiceDates('2026-03', closesOn31DueOn8)).toEqual({
      periodStart: '2026-01-31',
      periodEnd: '2026-02-27',
      closingDate: '2026-02-28',
      dueDate: '2026-03-08',
    });
  });

  it('rejeita dias inválidos', () => {
    expect(() => invoiceDates('2026-12', { closingDay: 0, dueDay: 10 })).toThrow(RangeError);
    expect(() => invoiceDates('2026-12', { closingDay: 3, dueDay: 32 })).toThrow(RangeError);
  });
});

describe('invoiceMonthFor', () => {
  it.each([
    ['2026-11-15', '2026-12'],
    ['2026-12-02', '2026-12'],
    // Compra no dia do fechamento vai para a próxima fatura.
    ['2026-12-03', '2027-01'],
    ['2026-12-31', '2027-01'],
  ])('fecha dia 3 e vence dia 10: compra em %s → fatura %s', (date, expected) => {
    expect(invoiceMonthFor(date, closesOn3DueOn10)).toBe(expected);
  });

  it.each([
    ['2026-11-24', '2026-12'],
    ['2026-11-25', '2027-01'],
    ['2026-12-26', '2027-02'],
  ])('fecha dia 25 e vence dia 5: compra em %s → fatura %s', (date, expected) => {
    expect(invoiceMonthFor(date, closesOn25DueOn5)).toBe(expected);
  });

  it.each([
    ['2026-02-27', '2026-03'],
    ['2026-02-28', '2026-04'],
    ['2026-03-01', '2026-04'],
    ['2024-02-29', '2024-04'],
  ])('fecha dia 31 e vence dia 8: compra em %s → fatura %s', (date, expected) => {
    expect(invoiceMonthFor(date, closesOn31DueOn8)).toBe(expected);
  });

  it('é consistente com o período de invoiceDates para todos os dias de 2 anos', () => {
    const cycles = [
      closesOn3DueOn10,
      closesOn25DueOn5,
      closesOn31DueOn8,
      { closingDay: 10, dueDay: 10 },
    ];
    for (const cycle of cycles) {
      const day = new Date(Date.UTC(2025, 0, 1));
      while (day.getUTCFullYear() < 2027) {
        const date = day.toISOString().slice(0, 10);
        const { periodStart, periodEnd } = invoiceDates(invoiceMonthFor(date, cycle), cycle);
        expect(date >= periodStart && date <= periodEnd, `${date} ${JSON.stringify(cycle)}`).toBe(
          true,
        );
        day.setUTCDate(day.getUTCDate() + 1);
      }
    }
  });

  it('rejeita data inválida', () => {
    expect(() => invoiceMonthFor('2026-02-30', closesOn3DueOn10)).toThrow(RangeError);
  });
});
